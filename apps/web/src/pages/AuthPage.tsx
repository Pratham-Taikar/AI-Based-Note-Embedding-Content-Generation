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
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-4 text-center">AskMyNotes</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Sign {mode === "login" ? "in" : "up"} with your email to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <button
              type="button"
              className="text-slate-700 underline"
              onClick={() => setMode("signup")}
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              type="button"
              className="text-slate-700 underline"
              onClick={() => setMode("login")}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
