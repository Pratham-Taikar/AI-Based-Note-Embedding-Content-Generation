import { FormEvent, useEffect, useState } from "react";
import { VoiceButton } from "../components/VoiceButton";
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

interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const QAPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QAResponse | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

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

  const runQa = async () => {
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

  const runAssistantFollowup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ answer: string }>("/assistant/followup", {
        subject_id: selectedSubject,
        question,
        history: assistantMessages,
      });
      const answer = res.data.answer;
      setAssistantMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: answer }]);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(answer);
        utter.onend = () => setAssistantSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        setAssistantSpeaking(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to run assistant follow-up");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (followUpMode) {
      void runAssistantFollowup();
    } else {
      void runQa();
    }
  };

  const handleVoiceCommand = (cmd: { type: string; payload?: any }) => {
    if (cmd.type === "ASK" && cmd.payload?.question) {
      setQuestion(cmd.payload.question);
      if (followUpMode) {
        void runAssistantFollowup();
      } else {
        void runQa();
      }
    }
  };

  const handleVoiceDictation = (text: string) => {
    // Always replace with the latest spoken input so the bar only reflects current speech.
    setQuestion(text);
  };

  const speakResult = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    if (listening) {
      return;
    }
    if (!result || result.status !== "ok" || result.snippets.length === 0) return;
    const utter = new SpeechSynthesisUtterance(
      result.snippets.map((s) => s.text).join("\n\n")
    );
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

  const stopAssistantSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    if (listening) {
      return;
    }
    window.speechSynthesis.cancel();
    setAssistantSpeaking(false);
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
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">
              Subject
            </label>
            <select
              className="select md:min-w-[220px]"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setAssistantMessages([]);
              }}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Follow-up mode</span>
            <button
              type="button"
              className={followUpMode ? "btn-primary text-xs px-3 py-1" : "btn-ghost text-xs px-3 py-1"}
              onClick={() => {
                setFollowUpMode((prev) => !prev);
                setAssistantMessages([]);
              }}
            >
              {followUpMode ? "On" : "Off"}
            </button>
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              Q&amp;A never calls an LLM. Everything you see comes directly from your notes.
            </p>
            <VoiceButton
              mode="qa"
              onFinalText={handleVoiceDictation}
              onCommand={handleVoiceCommand}
              onListeningChange={setListening}
            />
          </div>
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
        <div className="flex items-center justify-between mb-2 gap-3">
          <h2 className="text-lg font-medium text-slate-50">Result</h2>
          {result?.status === "ok" && result.snippets.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={speaking ? stopSpeaking : speakResult}
              >
                {speaking ? "Stop speaking" : "Read aloud"}
              </button>
            </div>
          )}
        </div>
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

      {assistantMessages.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg font-medium text-slate-50">Assistant Conversation</h2>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={assistantSpeaking ? stopAssistantSpeaking : () => {
                const lastAssistant = [...assistantMessages].reverse().find((m) => m.role === "assistant");
                if (!lastAssistant || typeof window === "undefined" || !("speechSynthesis" in window)) {
                  return;
                }
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(lastAssistant.content);
                utter.onend = () => setAssistantSpeaking(false);
                window.speechSynthesis.speak(utter);
                setAssistantSpeaking(true);
              }}
            >
              {assistantSpeaking ? "Stop speaking" : "Read aloud"}
            </button>
          </div>
          <div className="space-y-2 text-sm">
            {assistantMessages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={
                  m.role === "user"
                    ? "rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2"
                    : "rounded-lg border border-emerald-600/60 bg-emerald-900/40 px-3 py-2"
                }
              >
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  {m.role === "user" ? "You" : "Assistant"}
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-line">{m.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QAPage;
