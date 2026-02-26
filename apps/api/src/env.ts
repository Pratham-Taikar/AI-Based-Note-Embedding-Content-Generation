import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url({ message: "SUPABASE_URL must be a valid URL" }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, "SUPABASE_STORAGE_BUCKET is required"),

  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_LLM_MODEL: z.string().default("llama-3.1-8b-instant"),

  EMBEDDING_DIM: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => v === 384, { message: "EMBEDDING_DIM must be 384" }),

  SIMILARITY_THRESHOLD: z
    .string()
    .default("0.35")
    .transform((v) => Number(v)),

  PORT: z
    .string()
    .default("4000")
    .transform((v) => Number(v)),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (): Env => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Produce a readable error for missing/misconfigured env vars
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
};
