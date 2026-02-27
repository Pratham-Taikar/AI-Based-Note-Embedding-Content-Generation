import Groq from "groq-sdk";
import { z } from "zod";
import { loadEnv } from "./env";
import { supabaseAdmin } from "./supabase";
import { embedText } from "./providers/embeddings";

const env = loadEnv();

const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

const followupSchema = z.object({
  subject_id: z.string().uuid(),
  question: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .default([]),
});

const callGroqAnswer = async (systemPrompt: string, userPrompt: string) => {
  const completion = await groq.chat.completions.create({
    model: env.GROQ_LLM_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty response");
  }
  return content;
};

export const handleAssistantFollowup = async (userId: string, body: unknown) => {
  const parsed = followupSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join("; "));
  }

  const { subject_id, question, history } = parsed.data;

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

  const context =
    matches && matches.length > 0
      ? matches
          .map(
            (m: any) =>
              `FILE: ${m.file_name}\nPAGE: ${m.page_range}\nCHUNK_INDEX: ${m.chunk_index}\nTEXT:\n${m.content}\n---`
          )
          .join("\n\n")
      : "No directly relevant chunks were found for this question.";

  const historyText =
    history.length === 0
      ? "No previous conversation."
      : history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n");

  const systemPrompt = `
You are an assistant helping a user study from their own notes.
You MUST base your answers only on the provided context from their notes.
If the notes do not contain enough information to answer, clearly say that it is not covered in their notes.
Use the conversation history to keep answers coherent, but never introduce facts that are not grounded in the notes.
Respond in a concise paragraph or short list that would be easy to read aloud.
`;

  const userPrompt = `
Subject: ${subject.name}

Conversation so far:
${historyText}

User's new question:
${question}

Relevant note chunks:
${context}

Task:
- Answer the question for the user.
- Base everything on the note chunks above.
- If the answer is not in the notes, say so explicitly.
`;

  const answer = await callGroqAnswer(systemPrompt, userPrompt);

  return { answer };
};

