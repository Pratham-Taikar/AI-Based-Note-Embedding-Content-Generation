import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

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

  const handleGenerateMcq = async (e: FormEvent) => {
    e.preventDefault();
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

  const handleGenerateShort = async (e: FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Study Mode</h1>
      <p className="text-sm text-slate-600 mb-4">
        Generate MCQs and short-answer questions from your notes for a single subject.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form className="flex flex-col md:flex-row gap-3 md:items-center">
          <label className="text-sm font-medium">
            Subject
            <select
              className="border rounded px-3 py-2 text-sm ml-2"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">MCQs</h2>
            <form onSubmit={handleGenerateMcq}>
              <button
                type="submit"
                disabled={mcqLoading || !selectedSubject}
                className="bg-slate-900 text-white rounded px-3 py-1 text-sm disabled:opacity-60"
              >
                {mcqLoading ? "Generating..." : "Generate MCQs"}
              </button>
            </form>
          </div>
          {!mcqResult && <p className="text-sm text-slate-500">No MCQs yet.</p>}
          {mcqResult?.status === "insufficient" && (
            <p className="text-sm text-slate-700 whitespace-pre-line">{mcqResult.message}</p>
          )}
          {mcqResult?.status === "ok" && (
            <ol className="list-decimal list-inside space-y-3 text-sm">
              {mcqResult.items.map((item, idx) => (
                <li key={idx} className="border rounded p-2">
                  <p className="font-medium mb-1">{item.question}</p>
                  <ul className="text-sm mb-1">
                    <li>A. {item.options.A}</li>
                    <li>B. {item.options.B}</li>
                    <li>C. {item.options.C}</li>
                    <li>D. {item.options.D}</li>
                  </ul>
                  <p className="text-xs text-emerald-700 mb-1">
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

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Short answers</h2>
            <form onSubmit={handleGenerateShort}>
              <button
                type="submit"
                disabled={shortLoading || !selectedSubject}
                className="bg-slate-900 text-white rounded px-3 py-1 text-sm disabled:opacity-60"
              >
                {shortLoading ? "Generating..." : "Generate short answers"}
              </button>
            </form>
          </div>
          {!shortResult && <p className="text-sm text-slate-500">No short-answer questions yet.</p>}
          {shortResult?.status === "insufficient" && (
            <p className="text-sm text-slate-700 whitespace-pre-line">{shortResult.message}</p>
          )}
          {shortResult?.status === "ok" && (
            <ol className="list-decimal list-inside space-y-3 text-sm">
              {shortResult.items.map((item, idx) => (
                <li key={idx} className="border rounded p-2">
                  <p className="font-medium mb-1">{item.question}</p>
                  <p className="text-sm mb-1">{item.answer}</p>
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
    </div>
  );
};

export default StudyPage;
