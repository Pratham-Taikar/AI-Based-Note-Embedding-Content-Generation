import { z } from "zod";
import { supabaseAdmin, SIMILARITY_THRESHOLD } from "./supabase";
import { embedText } from "./providers/embeddings";

const qaRequestSchema = z.object({
  subject_id: z.string().uuid(),
  question: z.string().min(1),
});

const STOPWORDS = new Set([
  "the",
  "is",
  "and",
  "or",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "as",
  "that",
  "this",
  "it",
  "are",
  "was",
  "be",
  "can",
  "will",
  "shall",
]);

const splitIntoSentences = (text: string): string[] => {
  const sentences = text
    .split(/(?<=[\.!\?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences;
};

const sentenceScore = (sentence: string, questionTokens: Set<string>): number => {
  const tokens = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
  let score = 0;
  for (const t of tokens) {
    if (questionTokens.has(t)) {
      score += 1;
    }
  }
  return score;
};

const confidenceFromSimilarity = (similarity: number | null): "High" | "Medium" | "Low" | "NotFound" => {
  if (similarity === null || similarity < SIMILARITY_THRESHOLD) return "NotFound";
  if (similarity >= 0.6) return "High";
  if (similarity >= 0.45) return "Medium";
  return "Low";
};

export const handleQaRequest = async (userId: string, body: unknown) => {
  const parsed = qaRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join("; "));
  }
  const { subject_id, question } = parsed.data;

  // Verify subject belongs to user and fetch name
  const { data: subject, error: subjectError } = await supabaseAdmin
    .from("subjects")
    .select("id, name, user_id")
    .eq("id", subject_id)
    .eq("user_id", userId)
    .single();

  if (subjectError || !subject) {
    throw new Error("Subject not found for user");
  }

  const questionEmbedding = await embedText(question);

  const { data: matches, error: matchError } = await supabaseAdmin.rpc("match_chunks", {
    p_user_id: userId,
    p_subject_id: subject_id,
    query_embedding: questionEmbedding,
    match_count: 15,
  });

  if (matchError) {
    throw new Error(`match_chunks RPC failed. Ensure schema.sql is applied. Details: ${matchError.message}`);
  }

  if (!matches || matches.length === 0) {
    return {
      status: "not_found" as const,
      message: `Not found in your notes for ${subject.name}`,
    };
  }

  // Determine best similarity
  let bestSimilarity: number | null = null;
  for (const m of matches) {
    if (typeof m.similarity === "number") {
      if (bestSimilarity === null || m.similarity > bestSimilarity) {
        bestSimilarity = m.similarity;
      }
    }
  }

  const conf = confidenceFromSimilarity(bestSimilarity);
  if (conf === "NotFound") {
    return {
      status: "not_found" as const,
      message: `Not found in your notes for ${subject.name}`,
    };
  }

  const qTokens = new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t && !STOPWORDS.has(t))
  );

  type SentenceEvidence = {
    text: string;
    file_name: string;
    page_range: string;
    chunk_id: string;
    similarity: number;
    score: number;
  };

  const evidences: SentenceEvidence[] = [];

  for (const m of matches) {
    const sentences = splitIntoSentences(m.content as string);
    for (const s of sentences) {
      const score = sentenceScore(s, qTokens);
      if (score <= 0) continue;
      evidences.push({
        text: s,
        file_name: m.file_name,
        page_range: m.page_range,
        chunk_id: m.id,
        similarity: m.similarity ?? 0,
        score,
      });
    }
  }

  evidences.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.similarity - a.similarity;
  });

  const topEvidences = evidences.slice(0, 8);

  if (topEvidences.length === 0) {
    return {
      status: "not_found" as const,
      message: `Not found in your notes for ${subject.name}`,
    };
  }

  // Ensure verbatim: we are returning exact sentence strings from chunks
  return {
    status: "ok" as const,
    confidence: conf,
    snippets: topEvidences.map((e) => ({
      text: e.text,
      file_name: e.file_name,
      page_range: e.page_range,
      chunk_id: e.chunk_id,
      similarity: e.similarity,
    })),
  };
};
