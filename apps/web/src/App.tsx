import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import QAPage from "./pages/QAPage";
import StudyPage from "./pages/StudyPage";
import LandingPage from "./pages/LandingPage";
import { supabase } from "./supabaseClient";

const AppShell = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-2xl font-semibold text-transparent"
            >
              AskMyNotes/AntiMatter
            </Link>
            <nav className="flex gap-2 text-base rounded-full border border-slate-800/80 bg-slate-900/70 px-1.5 py-1">
              <Link
                to="/dashboard"
                className={
                  location.pathname === "/dashboard"
                    ? "rounded-full bg-slate-800 px-4 py-1.5 text-sm font-semibold text-emerald-300 shadow-inner shadow-slate-900"
                    : "rounded-full px-4 py-1.5 text-sm text-slate-200 hover:text-emerald-300"
                }
              >
                Dashboard
              </Link>
              <Link
                to="/qa"
                className={
                  location.pathname === "/qa"
                    ? "rounded-full bg-slate-800 px-4 py-1.5 text-sm font-semibold text-emerald-300 shadow-inner shadow-slate-900"
                    : "rounded-full px-4 py-1.5 text-sm text-slate-200 hover:text-emerald-300"
                }
              >
                Q&amp;A
              </Link>
              <Link
                to="/study"
                className={
                  location.pathname === "/study"
                    ? "rounded-full bg-slate-800 px-4 py-1.5 text-sm font-semibold text-emerald-300 shadow-inner shadow-slate-900"
                    : "rounded-full px-4 py-1.5 text-sm text-slate-200 hover:text-emerald-300"
                }
              >
                Study
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-slate-200 hover:text-emerald-300 underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/qa" element={<QAPage />} />
          <Route path="/study" element={<StudyPage />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAuthenticated(!!session);
      setChecking(false);

      supabase.auth.onAuthStateChange((_event, sessionUpdate) => {
        setAuthenticated(!!sessionUpdate);
      });
    };
    void init();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <AuthPage />;
  }

  return <AppShell />;
};

export default App;
