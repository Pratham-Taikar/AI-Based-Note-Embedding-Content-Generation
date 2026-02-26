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
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Q&amp;A</h1>
      <p className="text-sm text-slate-600 mb-4">
        Ask questions scoped strictly to one subject; answers are verbatim snippets from your notes.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
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
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Question</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g. Explain quicksort algorithm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !question || !selectedSubject}
          className="bg-slate-900 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-2">Result</h2>
        {!result && <p className="text-sm text-slate-500">No question yet.</p>}
        {result?.status === "not_found" && (
          <p className="text-sm text-slate-700 whitespace-pre-line">{result.message}</p>
        )}
        {result?.status === "ok" && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold">Confidence:</span>{" "}
              <span
                className={
                  result.confidence === "High"
                    ? "text-emerald-600"
                    : result.confidence === "Medium"
                    ? "text-amber-600"
                    : "text-red-600"
                }
              >
                {result.confidence}
              </span>
            </p>
            <div className="space-y-2">
              {result.snippets.map((s) => (
                <div key={s.chunk_id + s.page_range + s.text.slice(0, 8)} className="border rounded p-2">
                  <p className="text-sm whitespace-pre-line">{s.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold">Source:</span> {s.file_name} — page {s.page_range},{" "}
                    chunk {s.chunk_id}
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
