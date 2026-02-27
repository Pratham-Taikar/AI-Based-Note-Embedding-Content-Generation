// Lazy-loaded embedding pipeline so the model is loaded only once.
let embeddingPipeline:
  | ((
      text: string,
      options?: { pooling?: "mean"; normalize?: boolean }
    ) => Promise<{ data: Float32Array }>)
  | null = null;

const getEmbeddingPipeline = async () => {
  if (!embeddingPipeline) {
    const { pipeline } = await import("@xenova/transformers");
    const pipe = (await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    )) as unknown as (
      text: string,
      options?: { pooling?: "mean"; normalize?: boolean }
    ) => Promise<{ data: Float32Array }>;
    embeddingPipeline = async (text: string, options?: { pooling?: "mean"; normalize?: boolean }) => {
      const output: any = await (pipe as any)(text, {
        pooling: options?.pooling ?? "mean",
        normalize: options?.normalize ?? true,
      });
      return { data: output.data as Float32Array };
    };
  }
  return embeddingPipeline;
};

export const embedText = async (text: string): Promise<number[]> => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Cannot embed empty text");
  }

  const pipe = await getEmbeddingPipeline();
  const result = await pipe(trimmed, { pooling: "mean", normalize: true });

  // Return a normalized 384-dimensional vector.
  return Array.from(result.data);
};

