import axios from "axios";
import { supabase } from "./supabaseClient";

const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.error("VITE_API_BASE_URL is not set");
}

export const api = axios.create({
  baseURL: baseURL ?? "http://localhost:4000",
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
