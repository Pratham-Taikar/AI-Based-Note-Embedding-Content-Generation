import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkMultiPageText } from "./chunking";
import { embedText } from "./providers/embeddings";
import { STORAGE_BUCKET, supabaseAdmin } from "./supabase";

interface IngestParams {
  filePath: string;
  fileName: string;
  userId: string;
  subjectId: string;
}

export interface IngestResult {
  documentId: string;
  chunkCount: number;
  pageCount: number;
}

const readTxtFile = async (filePath: string): Promise<{ pages: { pageNumber: number; text: string }[] }> => {
  const raw = await fs.promises.readFile(filePath, "utf8");
  // Treat as single page
  return { pages: [{ pageNumber: 1, text: raw }] };
};

const readPdfFile = async (filePath: string): Promise<{ pages: { pageNumber: number; text: string }[]; pageCount: number }> => {
  const dataBuffer = await fs.promises.readFile(filePath);
  const pdfData = await pdfParse(dataBuffer);

  // pdf-parse returns full text; page-wise extraction is approximate here.
  // A more advanced implementation could use pdf.js, but for hackathon scope this is acceptable.
  const pagesRaw = pdfData.text.split(/\n\s*\n/g); // rough page split
  const pages = pagesRaw.map((text: string, idx: number) => ({
    pageNumber: idx + 1,
    text,
  }));

  return {
    pages,
    pageCount: pages.length,
  };
};

export const uploadToSupabaseStorage = async (
  client: SupabaseClient,
  params: { filePath: string; bucket: string; userId: string; subjectId: string; fileName: string }
): Promise<string> => {
  const storagePath = `${params.userId}/${params.subjectId}/${Date.now()}-${params.fileName}`;
  const fileBuffer = await fs.promises.readFile(params.filePath);

  const { error } = await client.storage.from(params.bucket).upload(storagePath, fileBuffer, {
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  return storagePath;
};

export const ingestDocument = async ({
  filePath,
  fileName,
  userId,
  subjectId,
}: IngestParams): Promise<IngestResult> => {
  const ext = path.extname(fileName).toLowerCase();

  let pages: { pageNumber: number; text: string }[] = [];
  let pageCount = 1;

  if (ext === ".txt") {
    const result = await readTxtFile(filePath);
    pages = result.pages;
    pageCount = pages.length;
  } else if (ext === ".pdf") {
    const result = await readPdfFile(filePath);
    pages = result.pages;
    pageCount = result.pageCount;
  } else {
    throw new Error("Unsupported file type. Only PDF and TXT are allowed.");
  }

  const storagePath = await uploadToSupabaseStorage(supabaseAdmin, {
    filePath,
    bucket: STORAGE_BUCKET,
    userId,
    subjectId,
    fileName,
  });

  // Insert document
  const { data: docInsert, error: docError } = await supabaseAdmin
    .from("documents")
    .insert({
      user_id: userId,
      subject_id: subjectId,
      file_name: fileName,
      storage_path: storagePath,
      page_count: pageCount,
    })
    .select("id")
    .single();

  if (docError || !docInsert) {
    throw new Error(`Failed to insert document record: ${docError?.message}`);
  }

  const documentId = docInsert.id as string;

  // Chunk and embed
  const chunks = chunkMultiPageText(pages);

  const rows = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    rows.push({
      user_id: userId,
      subject_id: subjectId,
      document_id: documentId,
      file_name: fileName,
      page_range: chunk.pageRange,
      chunk_index: chunk.index,
      content: chunk.content,
      embedding,
    });
  }

  if (rows.length > 0) {
    const { error: chunksError } = await supabaseAdmin.from("chunks").insert(rows);
    if (chunksError) {
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }
  }

  return {
    documentId,
    chunkCount: rows.length,
    pageCount,
  };
};
