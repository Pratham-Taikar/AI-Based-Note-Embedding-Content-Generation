import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="page-shell max-w-5xl space-y-16">
      <section className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
            Study with your own notes
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight text-slate-50">
            Turn messy PDFs into a{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
              focused study assistant
            </span>
            .
          </h1>
          <p className="text-base md:text-lg text-slate-300">
            Ask questions, get verbatim answers from your own material, and generate targeted practice questions
            in seconds. Everything stays inside your Supabase project.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard" className="btn-primary px-7 py-3 text-lg">
              Go to dashboard
            </Link>
            <Link to="/qa" className="btn-ghost text-lg">
              Jump into Q&amp;A
            </Link>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-base text-slate-300 md:text-lg">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjects</dt>
              <dd className="text-2xl font-semibold text-slate-50">Up to 3</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Study modes</dt>
              <dd className="text-2xl font-semibold text-slate-50">Q&amp;A • MCQ • Short</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 mb-3">
              How it works
            </p>
            <ul className="space-y-2 text-base md:text-lg text-slate-200">
              <li>1. Create a subject for each topic you&apos;re studying.</li>
              <li>2. Upload your PDFs or TXT files — nothing leaves Supabase.</li>
              <li>3. Ask questions or generate practice; citations link back to exact pages.</li>
            </ul>
          </div>
          <div className="card-subtle p-5 space-y-3">
            <p className="text-base font-medium text-slate-100 md:text-lg">
              &ldquo;Q&amp;A never calls an LLM. Every answer is grounded in your notes.&rdquo;
            </p>
            <p className="text-sm text-slate-500">Designed for transparent, citation-first studying.</p>
            <div className="flex gap-2">
              <Link to="/study" className="btn-primary flex-1 justify-center text-lg">
                Open Study Mode
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">Built for serious studying</h2>
        <p className="text-lg text-slate-300 md:max-w-3xl">
          AskMyNotes-AntiMatter is designed for students, engineers, and researchers who care about{" "}
          <span className="font-semibold text-slate-100">trustworthy answers</span>. Instead of guessing, the app
          surfaces exact passages from your notes, along with clear citations, so you always know where an answer
          came from.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card-subtle p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Subject-scoped Q&amp;A</h3>
            <p className="text-base text-slate-300">
              Keep each topic cleanly separated. Every question is answered strictly within the subject you select,
              so results stay focused and relevant.
            </p>
          </div>
          <div className="card-subtle p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Evidence-first answers</h3>
            <p className="text-base text-slate-300">
              The Q&amp;A engine never invents content. It retrieves chunks from your notes and shows them as
              verbatim snippets with page-level citations.
            </p>
          </div>
          <div className="card-subtle p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Practice that matches your notes</h3>
            <p className="text-base text-slate-300">
              Study Mode uses Groq to generate MCQs and short-answer questions, but it is forced to stay grounded in
              the text you&apos;ve uploaded.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">What happens to your data?</h2>
        <p className="text-lg text-slate-300 md:max-w-3xl">
          Your notes, subjects, documents, and embeddings live entirely in your own Supabase project. The web app
          and API simply talk to that project using your keys; there is no central multi-tenant database.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card-subtle p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Supabase-native storage</h3>
            <p className="text-base text-slate-300">
              Files are stored in a Supabase storage bucket, and text chunks are written into Postgres with
              pgvector. All access is scoped to your Supabase user id.
            </p>
          </div>
          <div className="card-subtle p-4 space-y-2">
            <h3 className="text-lg font-semibold text-slate-50">Auth-aware API</h3>
            <p className="text-base text-slate-300">
              Every API request validates a Supabase JWT before performing any operation, ensuring that no one else
              can read or modify your subjects or notes.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">A simple study workflow</h2>
        <ol className="space-y-4 text-lg text-slate-200 md:max-w-3xl list-decimal list-inside">
          <li>
            <span className="font-semibold">Import your materials.</span> Organize your PDFs and TXT files into up
            to three focused subjects.
          </li>
          <li>
            <span className="font-semibold">Explore with Q&amp;A.</span> Ask questions to quickly locate the exact
            explanations and definitions you need.
          </li>
          <li>
            <span className="font-semibold">Switch to Study Mode.</span> Generate MCQs and short-answer questions to
            test your understanding, with citations you can always verify.
          </li>
        </ol>
        <div className="flex flex-wrap gap-4">
          <Link to="/dashboard" className="btn-primary px-7 py-3 text-lg">
            Start with a new subject
          </Link>
          <Link to="/study" className="btn-ghost text-lg">
            Or open Study Mode
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

