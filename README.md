## AskMyNotes Monorepo

AskMyNotes is a subject-scoped notes Q&A and study assistant. It uses your own PDFs/TXT notes stored in Supabase, with OpenAI embeddings for retrieval and Groq for study question generation.

### Structure

- `apps/api`: Node.js + Express + TypeScript backend.
- `apps/web`: React (Vite) + TypeScript + Tailwind frontend.
- `supabase/schema.sql`: Database schema and `match_chunks` RPC for pgvector search.

### Prerequisites

- Node.js 18+
- Supabase project with:
  - Postgres + `pgvector` extension enabled.
  - Storage bucket named `notes`.
  - Auth (email/password) enabled.

### Supabase setup

1. In the Supabase SQL editor, run the contents of `supabase/schema.sql`.
2. Ensure the `pgvector` extension is enabled:

   ```sql
   create extension if not exists vector;
   ```

3. Create a storage bucket named `notes` (public or private; private is recommended).
4. Copy:
   - Project URL
   - `anon` key
   - `service_role` key

### Env configuration

Copy the example env files and fill in real values:

```bash
cd apps/api
cp .env.example .env

cd ../web
cp .env.example .env
```

Required variables are documented in each `.env.example` file.

### Install & run (Windows friendly)

From the monorepo root:

```bash
npm install
npm run dev
```

This runs:
- Backend API on port `4000`
- Frontend Vite dev server on port `5173` (by default)

### Quick test flow

1. Start the dev servers: `npm run dev`.
2. In the web app:
   - Sign up / log in with email + password (Supabase Auth).
   - Create up to **3 subjects**.
   - Upload PDF/TXT notes per subject (multiple files allowed).
3. Q&A:
   - Go to the Q&A page.
   - Select a subject and ask a question.
   - The answer shows:
     - Verbatim evidence snippets from your notes.
     - Citations (file, page, chunk).
     - Confidence based on similarity score.
   - If nothing relevant is found:
     - You will see: `Not found in your notes for [Subject]`.
4. Study mode:
   - Go to the Study page.
   - Select a subject.
   - Generate MCQs or short-answer questions.
   - Each item includes citations pointing back to your chunks.

### Notes

- Q&A never calls any LLM and only returns exact snippets from your notes.
- Study mode uses Groq but is restricted to provided chunks only.
- All API endpoints verify Supabase JWTs and scope data by `user_id`.
