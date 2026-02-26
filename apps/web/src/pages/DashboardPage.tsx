import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";

interface Subject {
  id: string;
  name: string;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  page_count: number | null;
}

const DashboardPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [documentsBySubject, setDocumentsBySubject] = useState<Record<string, Document[]>>({});
  const FILE_LIMIT_PER_SUBJECT = 10;

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    setError(null);
    try {
      const res = await api.get<Subject[]>("/subjects");
      setSubjects(res.data);

      // Load documents for each
      const docEntries: Record<string, Document[]> = {};
      await Promise.all(
        res.data.map(async (s) => {
          const docsRes = await api.get<Document[]>("/documents", {
            params: { subject_id: s.id },
          });
          docEntries[s.id] = docsRes.data;
        })
      );
      setDocumentsBySubject(docEntries);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to load subjects");
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    void loadSubjects();
  }, []);

  const handleCreateSubject = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<Subject>("/subjects", { name: newSubjectName });
      setNewSubjectName("");
      setSubjects((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to create subject");
    }
  };

  const handleUpload = async (subjectId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploadingFor(subjectId);
    try {
      const existingCount = (documentsBySubject[subjectId] ?? []).length;
      const remaining = Math.max(FILE_LIMIT_PER_SUBJECT - existingCount, 0);
      const filesToUpload = Array.from(files).slice(0, remaining);

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("subject_id", subjectId);
        formData.append("file", file);
        // Upload sequentially to keep API load reasonable
        await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      await loadSubjects();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to upload file");
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const confirmDelete = window.confirm(
      "Delete this subject and all of its uploaded documents and chunks? This cannot be undone."
    );
    if (!confirmDelete) return;

    setError(null);
    try {
      await api.delete(`/subjects/${subjectId}`);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setDocumentsBySubject((prev) => {
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to delete subject");
    }
  };

  const reachedLimit = subjects.length >= 3;

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Create up to 3 subjects and upload PDF/TXT notes to build your personal knowledge base.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="card-subtle p-5 mb-4">
        <h2 className="text-lg font-medium text-slate-50 mb-2">Subjects</h2>
        <form onSubmit={handleCreateSubject} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            className="input flex-1 min-w-[180px]"
            placeholder="New subject name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            disabled={reachedLimit}
          />
          <button
            type="submit"
            disabled={reachedLimit || !newSubjectName}
            className="btn-primary"
          >
            Add subject
          </button>
        </form>
        {reachedLimit && (
          <p className="text-xs text-amber-300/80">
            You have reached the maximum of 3 subjects for this account.
          </p>
        )}
        {loadingSubjects ? (
          <p className="text-sm text-slate-400">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-slate-400">No subjects yet. Create your first subject to get started.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {subjects.map((s) => (
              <div key={s.id} className="card-subtle p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-50">{s.name}</h3>
                    <p className="text-xs text-slate-500">
                      {(documentsBySubject[s.id] ?? []).length} / {FILE_LIMIT_PER_SUBJECT} files uploaded
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSubject(s.id)}
                    className="btn-ghost text-xs px-2 py-1"
                  >
                    Delete subject
                  </button>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-slate-300">Upload notes (PDF/TXT, up to 10 files):</span>
                    <div className="flex items-center gap-3">
                      <label className="btn-ghost cursor-pointer text-sm">
                        Choose files
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.txt"
                          className="sr-only"
                          onChange={(e) => {
                            void handleUpload(s.id, e.target.files);
                            // Reset input so the same files can be chosen again if needed
                            e.target.value = "";
                          }}
                          disabled={(documentsBySubject[s.id] ?? []).length >= FILE_LIMIT_PER_SUBJECT}
                        />
                      </label>
                      <p className="text-xs text-slate-500">
                        {(documentsBySubject[s.id] ?? []).length >= FILE_LIMIT_PER_SUBJECT
                          ? "File limit reached for this subject."
                          : "You can add more files later if needed."}
                      </p>
                    </div>
                  </div>
                  {uploadingFor === s.id && (
                    <p className="text-xs text-emerald-300/80">Uploading and ingesting...</p>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Uploaded documents</p>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {(documentsBySubject[s.id] ?? []).map((d) => (
                      <li key={d.id} className="flex justify-between">
                        <span>{d.file_name}</span>
                        <span className="text-slate-500">
                          {d.page_count ? `${d.page_count} pages` : ""}
                        </span>
                      </li>
                    ))}
                    {(documentsBySubject[s.id] ?? []).length === 0 && (
                      <li className="text-slate-500">No documents yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
