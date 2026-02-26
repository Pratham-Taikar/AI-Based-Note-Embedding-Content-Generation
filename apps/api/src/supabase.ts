import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env";

const env = loadEnv();

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET;
export const SIMILARITY_THRESHOLD = env.SIMILARITY_THRESHOLD;
