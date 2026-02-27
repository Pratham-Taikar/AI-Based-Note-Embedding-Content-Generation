import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { VoiceButton } from "../components/VoiceButton";

interface Subject {
  id: string;
  name: string;
}

interface Citation {
  chunk_id: string;
  file: string;
  page: string;
}

interface MCQItem {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  citations: Citation[];
}

interface ShortItem {
  question: string;
  answer: string;
  citations: Citation[];
}

type StudyResponse<T> =
  | { status: "ok"; items: T[] }
  | { status: "insufficient"; message: string };

const StudyPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [mcqLoading, setMcqLoading] = useState(false);
  const [shortLoading, setShortLoading] = useState(false);
  const [mcqResult, setMcqResult] = useState<StudyResponse<MCQItem> | null>(null);
  const [shortResult, setShortResult] = useState<StudyResponse<ShortItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await api.get<Subject[]>("/subjects");
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedSubject(res.data[0].id);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error ?? "Failed to load subjects");
      }
    };
    void loadSubjects();
  }, []);

  const runGenerateMcq = async () => {
    setError(null);
    setMcqResult(null);
    setMcqLoading(true);
    try {
      const res = await api.post<StudyResponse<MCQItem>>("/study/mcq", {
        subject_id: selectedSubject,
      });
      setMcqResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to generate MCQs");
    } finally {
      setMcqLoading(false);
    }
  };

  const handleGenerateMcq = (e: FormEvent) => {
    e.preventDefault();
    void runGenerateMcq();
  };

  const runGenerateShort = async () => {
    setError(null);
    setShortResult(null);
    setShortLoading(true);
    try {
      const res = await api.post<StudyResponse<ShortItem>>("/study/short", {
        subject_id: selectedSubject,
      });
      setShortResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to generate short-answer questions");
    } finally {
      setShortLoading(false);
    }
  };

  const handleGenerateShort = (e: FormEvent) => {
    e.preventDefault();
    void runGenerateShort();
  };

  const handleVoiceCommand = (cmd: { type: string; payload?: any }) => {
    if (cmd.type === "GEN_MCQ") {
      void runGenerateMcq();
    }
    if (cmd.type === "GEN_SHORT") {
      void runGenerateShort();
    }
  };

  const handleVoiceDictation = () => {
    // Study page currently does not use dictation text; commands drive generation.
  };

  const speakStudy = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const parts: string[] = [];

    if (mcqResult?.status === "ok") {
      mcqResult.items.forEach((item, idx) => {
        parts.push(`Question ${idx + 1}: ${item.question}`);
        parts.push(`Options: A ${item.options.A}, B ${item.options.B}, C ${item.options.C}, D ${item.options.D}.`);
        parts.push(`Correct answer: ${item.correct}. ${item.explanation}`);
      });
    }

    if (shortResult?.status === "ok") {
      shortResult.items.forEach((item, idx) => {
        parts.push(`Short question ${idx + 1}: ${item.question}`);
        parts.push(`Answer: ${item.answer}`);
      });
    }

    if (parts.length === 0) return;

    const utter = new SpeechSynthesisUtterance(parts.join("\n\n"));
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="page-shell max-w-4xl">
      <div>
        <h1 className="page-title">Study Mode</h1>
        <p className="page-subtitle">
          Turn your notes into practice questions for active recall. Everything stays scoped to one subject.
        </p>
      </div>
      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

      <div className="card-subtle p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <form className="flex flex-col md:flex-row gap-3 md:items-center">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
                Subject
              </label>
              <select
                className="select md:min-w-[220px]"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
          <VoiceButton mode="study" onFinalText={handleVoiceDictation} onCommand={handleVoiceCommand} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-slate-50">MCQs</h2>
            <form onSubmit={handleGenerateMcq}>
              <button
                type="submit"
                disabled={mcqLoading || !selectedSubject}
                className="btn-primary px-3 py-1"
              >
                {mcqLoading ? "Generating..." : "Generate MCQs"}
              </button>
            </form>
          </div>
          {!mcqResult && <p className="text-sm text-slate-400">No MCQs yet.</p>}
          {mcqResult?.status === "insufficient" && (
            <p className="text-sm text-slate-300 whitespace-pre-line">{mcqResult.message}</p>
          )}
          {mcqResult?.status === "ok" && (
            <ol className="list-decimal list-inside space-y-3 text-sm text-slate-100">
              {mcqResult.items.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3 shadow-sm shadow-slate-950/40"
                >
                  <p className="font-medium mb-1 text-slate-50">{item.question}</p>
                  <ul className="text-sm mb-1">
                    <li>A. {item.options.A}</li>
                    <li>B. {item.options.B}</li>
                    <li>C. {item.options.C}</li>
                    <li>D. {item.options.D}</li>
                  </ul>
                  <p className="text-xs text-emerald-300 mb-1">
                    Correct: {item.correct} — {item.explanation}
                  </p>
                  <p className="text-xs text-slate-500">
                    Citations:{" "}
                    {item.citations
                      .map((c) => `${c.file} (page ${c.page}, chunk ${c.chunk_id})`)
                      .join("; ")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-slate-50">Short answers</h2>
            <form onSubmit={handleGenerateShort}>
              <button
                type="submit"
                disabled={shortLoading || !selectedSubject}
                className="btn-primary px-3 py-1"
              >
                {shortLoading ? "Generating..." : "Generate short answers"}
              </button>
            </form>
          </div>
          {!shortResult && <p className="text-sm text-slate-400">No short-answer questions yet.</p>}
          {shortResult?.status === "insufficient" && (
            <p className="text-sm text-slate-300 whitespace-pre-line">{shortResult.message}</p>
          )}
          {shortResult?.status === "ok" && (
            <ol className="list-decimal list-inside space-y-3 text-sm text-slate-100">
              {shortResult.items.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3 shadow-sm shadow-slate-950/40"
                >
                  <p className="font-medium mb-1 text-slate-50">{item.question}</p>
                  <p className="text-sm mb-1 text-slate-100">{item.answer}</p>
                  <p className="text-xs text-slate-500">
                    Citations:{" "}
                    {item.citations
                      .map((c) => `${c.file} (page ${c.page}, chunk ${c.chunk_id})`)
                      .join("; ")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      {(mcqResult?.status === "ok" || shortResult?.status === "ok") && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={speaking ? stopSpeaking : speakStudy}
          >
            {speaking ? "Stop speaking" : "Read aloud"}
          </button>
        </div>
      )}
    </div>
  );
};

export default StudyPage;
