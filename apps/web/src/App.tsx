import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import QAPage from "./pages/QAPage";
import StudyPage from "./pages/StudyPage";
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
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-900">AskMyNotes</span>
            <nav className="flex gap-3 text-sm">
              <Link
                to="/dashboard"
                className={
                  location.pathname === "/dashboard"
                    ? "text-slate-900 font-medium"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                Dashboard
              </Link>
              <Link
                to="/qa"
                className={
                  location.pathname === "/qa"
                    ? "text-slate-900 font-medium"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                Q&amp;A
              </Link>
              <Link
                to="/study"
                className={
                  location.pathname === "/study"
                    ? "text-slate-900 font-medium"
                    : "text-slate-500 hover:text-slate-900"
                }
              >
                Study
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-slate-600 hover:text-slate-900 underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 px-4">
        <Routes>
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
