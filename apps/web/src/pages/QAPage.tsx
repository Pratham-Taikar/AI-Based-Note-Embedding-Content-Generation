import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

interface Subject {
  id: string;
  name: string;
}

type Confidence = "High" | "Medium" | "Low";

interface QASnippet {
  text: string;
  file_name: string;
  page_range: string;
  chunk_id: string;
  similarity: number;
}

interface QAOkResponse {
  status: "ok";
  confidence: Confidence;
  snippets: QASnippet[];
}

interface QANotFoundResponse {
  status: "not_found";
  message: string;
}

type QAResponse = QAOkResponse | QANotFoundResponse;

const QAPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QAResponse | null>(null);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.post<QAResponse>("/qa", {
        subject_id: selectedSubject,
        question,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to run Q&A");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <div>
        <h1 className="page-title">Q&amp;A</h1>
        <p className="page-subtitle">
          Ask questions scoped to a single subject. Answers are verbatim snippets from your uploaded notes.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="card-subtle p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
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
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
            Question
          </label>
          <textarea
            className="textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g. Explain quicksort algorithm"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Q&amp;A never calls an LLM. Everything you see comes directly from your notes.
          </p>
          <button
            type="submit"
            disabled={loading || !question || !selectedSubject}
            className="btn-primary"
          >
            {loading ? "Searching..." : "Ask"}
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="text-lg font-medium text-slate-50 mb-2">Result</h2>
        {!result && <p className="text-sm text-slate-400">No question yet. Ask something to see results.</p>}
        {result?.status === "not_found" && (
          <p className="text-sm text-slate-300 whitespace-pre-line">{result.message}</p>
        )}
        {result?.status === "ok" && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold text-slate-200">Confidence:</span>{" "}
              <span
                className={
                  result.confidence === "High"
                    ? "text-emerald-400"
                    : result.confidence === "Medium"
                    ? "text-amber-300"
                    : "text-red-400"
                }
              >
                {result.confidence}
              </span>
            </p>
            <div className="space-y-3">
              {result.snippets.map((s) => (
                <div
                  key={s.chunk_id + s.page_range + s.text.slice(0, 8)}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/70 p-3"
                >
                  <p className="text-sm text-slate-100 whitespace-pre-line">{s.text}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-slate-300">Source:</span> {s.file_name} — page{" "}
                    {s.page_range}, chunk {s.chunk_id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QAPage;
