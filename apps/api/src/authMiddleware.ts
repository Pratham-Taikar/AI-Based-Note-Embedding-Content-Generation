import type { Request, Response, NextFunction } from "express";
import { supabaseAuth } from "./supabase";

export interface AuthedRequest extends Request {
  userId?: string;
}

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Invalid Authorization header" });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired Supabase JWT" });
    }

    req.userId = data.user.id;
    next();
  } catch (err) {
    console.error("Auth error", err);
    return res.status(500).json({ error: "Auth verification failed" });
  }
};
