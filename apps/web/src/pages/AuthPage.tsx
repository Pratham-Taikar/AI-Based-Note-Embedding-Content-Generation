import { FormEvent, useState } from "react";
import { supabase } from "../supabaseClient";

type Mode = "login" | "signup";

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Welcome to</p>
          <h1 className="mt-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            AskMyNotes
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Sign {mode === "login" ? "in" : "up"} with your email to manage and study your own notes.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <span>{mode === "login" ? "New here?" : "Already using AskMyNotes?"}</span>
          {mode === "login" ? (
            <button
              type="button"
              className="text-emerald-300 hover:text-emerald-200 underline"
              onClick={() => setMode("signup")}
            >
              Create an account
            </button>
          ) : (
            <button
              type="button"
              className="text-emerald-300 hover:text-emerald-200 underline"
              onClick={() => setMode("login")}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
