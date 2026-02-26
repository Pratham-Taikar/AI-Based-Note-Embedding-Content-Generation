## AskMyNotes-AntiMatter

AskMyNotes-AntiMatter is a subject‑scoped notes assistant that lets you:

- **Upload PDFs/TXT notes** into your own Supabase project.
- **Ask questions** and get **verbatim snippets** from your notes (no LLM answering in Q&A mode).
- Use **Study Mode** to generate MCQs and short‑answer questions grounded strictly in your notes via **Groq**.

All data (files, chunks, embeddings) lives in your Supabase project, and every request is scoped to the authenticated Supabase user.

---

### Overview

- **Backend**: Node.js, Express, TypeScript, Supabase, pgvector, local embeddings (via transformers).
- **Frontend**: React, Vite, TypeScript, Tailwind CSS.
- **Database/Infra**: Supabase Postgres with `pgvector`, storage bucket for note files, RPC for vector similarity search.

The monorepo is optimized for local development and can be adapted for production deployment (e.g., Vercel/Netlify for the web app and a Node hosting platform for the API) as long as both can reach the same Supabase project.

---

### Repository Structure

- `apps/api` – Node.js + Express + TypeScript REST API.
- `apps/web` – React (Vite) + TypeScript + Tailwind SPA.
- `supabase/schema.sql` – Database schema and `match_chunks` RPC for pgvector search.

---

### Core Features

- **Subjects & notes**
  - Create up to **3 subjects** per user.
  - Upload multiple **PDF** and **TXT** files per subject.
  - Files are stored in a Supabase storage bucket and chunked into embeddings in Postgres.

- **Q&A over your notes**
  - Ask free‑form questions per subject.
  - Retrieval uses **vector search** (pgvector) over text chunks.
  - Responses contain:
    - Verbatim evidence snippets from your notes.
    - Citations (file name, page, chunk index).
    - A confidence label based on similarity score.
  - **No LLM** is used in the Q&A pipeline; answers are purely extracted from your notes.

- **Study Mode**
  - Generate:
    - **MCQs** (multiple‑choice questions).
    - **Short‑answer questions**.
  - Uses **Groq** to synthesize questions and explanations from selected chunks.
  - Strictly grounded in the provided chunks (prompts and validation enforce this).

- **Security & multi‑tenancy**
  - All API endpoints validate Supabase JWTs.
  - All data (subjects, documents, chunks) is filtered by `user_id` at query time.

---

### Prerequisites

- **Node.js 18+**
- **Supabase project** with:
  - Postgres database.
  - `pgvector` extension enabled.
  - Storage bucket for notes (default name: `notes`).
  - Email/password auth enabled.
- **Groq account** with an API key (used by the API for Study Mode).

> All credentials are injected via environment variables; see **Environment Configuration** below.

---

### Supabase Setup

1. **Apply schema**
   - In the Supabase SQL editor, run the contents of `supabase/schema.sql`.

2. **Enable pgvector**
   - Ensure the `vector` extension is enabled (if not already):

   ```sql
   create extension if not exists vector;
   ```

3. **Create storage bucket**
   - Create a storage bucket named `notes` (or your preferred name; keep it in sync with your env config).
   - Private access is recommended so only the backend service role can read/write raw files.

4. **Collect Supabase credentials**
   - From your Supabase project settings, copy:
     - Project URL
     - `anon` key
     - `service_role` key

You will use these values in both the **API** and **Web** environment files.

---

### Environment Configuration

There are separate env files for the API and Web apps. Both provide `.env.example` templates.

From the monorepo root:

```bash
cd apps/api
cp .env.example .env

cd ../web
cp .env.example .env
```

Fill in the real values as instructed in each `.env.example` file. At a high level:

- **API (`apps/api/.env`)** – includes:
  - Supabase URL, `service_role` key, and `anon` key.
  - Storage bucket name (e.g., `notes`).
  - Groq API key and chosen model.
  - Embedding configuration (dimension, similarity threshold) and server port.

- **Web (`apps/web/.env`)** – includes:
  - Supabase URL and `anon` key for browser auth.
  - Base URL for the API (e.g., `http://localhost:4000` during development).

> The backend validates env configuration at startup and will fail fast with clear error messages if required values are missing or invalid.

---

### Install & Run (Local Development)

From the monorepo root (`AskMyNotes-AntiMatter`):

```bash
npm install
npm run dev
```

This will:

- Start the **backend API** on port `4000`.
- Start the **frontend** Vite dev server on port `5173` (default).

Both commands are orchestrated via the root `package.json` using npm workspaces and `concurrently`.

---

### Quick Validation Flow

Use this flow to confirm your setup is working end‑to‑end:

1. **Start dev servers**
   - Run `npm run dev` from the monorepo root.

2. **Sign up / log in**
   - Open the web app in your browser (default `http://localhost:5173`).
   - Sign up or log in with email/password (Supabase Auth).

3. **Create subjects & upload notes**
   - Create up to **3 subjects**.
   - For each subject, upload one or more **PDF/TXT** files.
   - The API will:
     - Upload files to the storage bucket.
     - Extract text (using `pdf-parse` for PDFs).
     - Chunk and embed content, then store it in the `chunks` table.

4. **Ask questions (Q&A)**
   - Navigate to the **Q&A** page.
   - Select a subject and ask a question.
   - You should see:
     - Evidence snippets from your notes.
     - Citations (file name, page number, chunk index).
     - A confidence label based on similarity.
   - If nothing relevant is found, the UI will indicate that the answer is not in your notes for the selected subject.

5. **Generate study questions**
   - Navigate to the **Study** page.
   - Select a subject.
   - Generate **MCQs** or **short‑answer** questions.
   - Each question includes:
     - The prompt and (for MCQs) options with the correct answer.
     - A short explanation.
     - Citations pointing back to the source chunks.

---

### High‑Level Architecture

- **Frontend (`apps/web`)**
  - React SPA using Vite and Tailwind.
  - Supabase client handles authentication and session state.
  - Axios (or similar) is used to call the API, attaching the Supabase JWT in the `Authorization` header.

- **Backend (`apps/api`)**
  - Express server with TypeScript.
  - Middleware validates Supabase JWTs and injects `userId` into the request context.
  - Endpoints for:
    - Subject management.
    - Document upload and ingestion.
    - Q&A retrieval using vector similarity + heuristic snippet ranking.
    - Study question generation via Groq with strict JSON response validation.

- **Database (`supabase/schema.sql`)**
  - Tables for `subjects`, `documents`, and `chunks` (with `vector(384)` embeddings).
  - RPC `match_chunks` encapsulates similarity search using pgvector and returns ranked chunks with similarity scores.

---

### Development Notes

- **Q&A pipeline**
  - Uses embeddings and pgvector search only.
  - Never calls an LLM; outputs are always direct excerpts from your notes.

- **Study pipeline**
  - Uses Groq to generate questions but is **constrained to provided chunks** via prompts and schema validation.
  - Responses are validated and normalized before being returned to the client.

- **Auth & security**
  - All non‑public endpoints validate Supabase JWTs.
  - Every query is scoped by `user_id` to ensure users can access only their own subjects, documents, and chunks.

---

### Contributing

This repository is structured as an npm workspaces monorepo; typical contribution workflow:

1. Install dependencies at the root: `npm install`.
2. Make changes in `apps/api` and/or `apps/web`.
3. Run type‑checking and linting from the root:

   ```bash
   npm run lint
   npm run build
   ```

4. Verify the full flow locally using the **Quick Validation Flow** above.

Feel free to adapt this project to your own Supabase/Groq setup, extend the schema, or tweak chunking and retrieval strategies for your use case.
