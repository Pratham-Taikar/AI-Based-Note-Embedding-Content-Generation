## AskMyNotes-AntiMatter

AskMyNotes-AntiMatter is a subject‑scoped notes assistant that turns messy PDFs and TXT files into a focused, citation‑first study companion. It lets you:

- **Upload notes** into your own Supabase project.
- **Ask questions** and get **verbatim snippets** back from your notes (no LLM answering in Q&A mode).
- Use **Study Mode** to generate MCQs and short‑answer questions grounded strictly in your notes via **Groq**.

All data (files, chunks, embeddings) lives in **your** Supabase project, and every request is scoped to the authenticated Supabase user.

> The UI screenshots and architecture diagrams below are illustrative; you can wire up your own assets under a `docs/` folder and keep this README as‑is.

---

### Screenshots

You can place screenshots under a `docs/` folder and wire them to these references:

- Landing page

  ```markdown
  ![AskMyNotes landing](docs/landing.png)
  ```

- Q&A experience

  ```markdown
  ![AskMyNotes Q&A](docs/qa.png)
  ```

- System architecture

  ```markdown
  ![AskMyNotes system architecture](docs/system-architecture.png)
  ```

---

### Overview

- **Backend**: Node.js, Express, TypeScript, Supabase, `pgvector`, local embeddings via `@xenova/transformers`.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, dark UI with a landing page and dashboard.
- **Database/Infra**: Supabase Postgres with `pgvector`, Supabase Storage for raw files, and an RPC for vector similarity search.

The monorepo is optimized for local development and can be adapted for production deployment (for example: web app on Vercel; API on a Node hosting platform) as long as both can reach the same Supabase project.

---

### Repository Structure

- `apps/api` – Node.js + Express + TypeScript REST API.
- `apps/web` – React (Vite) + TypeScript + Tailwind SPA.
- `supabase/schema.sql` – Database schema and `match_chunks` RPC for pgvector search.

---

### Core Product Features

- **Subjects & notes**
  - Create up to **3 subjects** per user.
  - For each subject, upload **up to 10 PDF/TXT files**.
  - Files are stored in a Supabase storage bucket and chunked into embeddings in Postgres.
  - Subjects can be **deleted**; their documents and chunks are removed via `ON DELETE CASCADE`.

- **Q&A over your notes (Evidence Mode)**
  - Ask free‑form questions scoped to a single subject.
  - Retrieval uses **vector search** (pgvector) over text chunks.
  - Responses contain:
    - Verbatim evidence snippets from your notes.
    - Citations (file name, page, chunk index).
    - A confidence label based on similarity score.
  - **No LLM** is used in the Q&A pipeline; answers are purely extracted from your notes.

- **Study / Explain Mode**
  - Generate:
    - **MCQs** (multiple‑choice questions).
    - **Short‑answer questions**.
  - Uses **Groq** to synthesize questions and explanations from selected chunks.
  - Strictly grounded in the provided chunks (prompts and Zod validation enforce this).

- **Security & multi‑tenancy**
  - All API endpoints validate Supabase JWTs.
  - All data (subjects, documents, chunks) is filtered by `user_id` at query time.
  - Storage paths are user‑scoped (`user_id/subject_id/...`) inside the bucket.

---

### Frontend Experience (`apps/web`)

- **Landing page (`/`)**
  - Dark, modern hero section describing the product.
  - Calls‑to‑action to open the dashboard, Q&A, and Study Mode.
  - Long‑form content explaining:
    - Why evidence‑first answers matter.
    - How data is handled in Supabase.
    - A simple three‑step study workflow.

- **Authentication**
  - Email/password signup and login using Supabase.
  - Session management handled by `@supabase/supabase-js`.

- **Dashboard**
  - Create and list subjects (max 3 per user).
  - Delete existing subjects (with confirmation).
  - For each subject:
    - Upload up to **10** PDF/TXT files (multi‑file upload).
    - View a list of uploaded documents with page counts.
    - See how many files are used out of the limit (e.g., `3 / 10 files uploaded`).

- **Q&A page**
  - Select a subject, type a question, and run Q&A.
  - Shows:
    - Confidence (High / Medium / Low) with color‑coded labels.
    - A list of retrieved snippets with verbatim text and citations.
  - Uses a shared Axios client that automatically attaches the Supabase access token.

- **Study page**
  - Select a subject once, then:
    - Generate 5 MCQs via `/study/mcq`.
    - Generate 3 short‑answer questions via `/study/short`.
  - Shows:
    - Question text, options, correct answer, and explanation.
    - Citations for each item (file, page, chunk).

---

### Backend API (`apps/api`)

- **Auth**
  - `authMiddleware` verifies a Supabase JWT from the `Authorization: Bearer <token>` header using the Supabase anon key.
  - On success, it attaches `req.userId` so every handler can scope queries by user.

- **Core endpoints**
  - `GET /health` – authenticated health check.
  - `POST /subjects` – create a new subject (max 3 per user).
  - `GET /subjects` – list subjects for the current user.
  - `DELETE /subjects/:id` – delete a subject and all associated documents/chunks.
  - `GET /documents?subject_id=...` – list documents (file name, page count) for a subject.
  - `POST /upload` – upload a PDF/TXT file, ingest it into Supabase Storage + Postgres + pgvector.
  - `POST /qa` – run Q&A using embeddings and pgvector search.
  - `POST /study/mcq` – generate MCQ questions via Groq.
  - `POST /study/short` – generate short‑answer questions via Groq.

- **Ingestion pipeline**
  - Accepts a single PDF/TXT file per request.
  - For PDFs, uses `pdf-parse` with a simple page split; for TXT, treats the file as a single page.
  - Writes the original file to Supabase Storage under `user_id/subject_id/<timestamp>-fileName`.
  - Inserts a `documents` row and then:
    - Chunks text using `chunkMultiPageText`.
    - Embeds each chunk with a local model via `@xenova/transformers`.
    - Inserts into the `chunks` table with the 384‑dimensional embedding.

- **Q&A pipeline**
  - Validates request via Zod.
  - Checks subject ownership.
  - Embeds the question, calls `match_chunks` RPC with the query embedding.
  - Scores sentences within each chunk using simple token overlaps and selects top snippets.
  - Returns structured `{ status, confidence, snippets }`.

- **Study pipeline**
  - Validates body via Zod and checks subject ownership.
  - Pulls up to 200 chunks for the subject, then samples a coverage set (up to 50).
  - Constructs a prompt for Groq with:
    - Chunk text.
    - Citations (chunk ids, file names, pages).
  - Expects **strict JSON** responses and validates them with Zod:
    - Retries up to 3 times on invalid or incomplete responses.
  - Returns either `{ status: "ok", items }` or `{ status: "insufficient", message }`.

---

### Database & RPCs (`supabase/schema.sql`)

- **Tables**
  - `subjects`
    - `id`, `user_id`, `name`, `created_at`.
    - Foreign key to `auth.users`, `ON DELETE CASCADE`.
  - `documents`
    - `id`, `user_id`, `subject_id`, `file_name`, `storage_path`, `page_count`, `created_at`.
    - Foreign key to `subjects`, `ON DELETE CASCADE`.
  - `chunks`
    - `id`, `user_id`, `subject_id`, `document_id`, `file_name`, `page_range`, `chunk_index`, `content`, `embedding vector(384)`, `created_at`.
    - Foreign key to `documents`, `ON DELETE CASCADE`.

- **Indexes**
  - On `subjects.user_id`, `documents (user_id, subject_id)`, `chunks (user_id, subject_id)`, and `chunks.document_id`.

- **RPC: `match_chunks`**
  - Given `p_user_id`, `p_subject_id`, and `query_embedding`, returns the top‑`k` most similar chunks.
  - Computes similarity as `1 - (embedding <=> query_embedding)` and orders by vector distance.

---

### System Architecture

The system can be reasoned about in layered form, matching the architecture diagram:

- **Client layer (React SPA)**
  - Landing page, dashboard, Q&A interface, and study mode UI.
  - Talks to the API with JSON requests and forwards Supabase auth tokens.

- **API layer (Express)**
  - Orchestrates:
    - File upload and ingestion.
    - Retrieval‑constrained Q&A (evidence mode).
    - Controlled generative study/explain mode via Groq.
  - Performs validation (payloads + auth) before calling downstream services.

- **Processing layer**
  - File processor (PDF/TXT).
  - Chunking engine.
  - Embedding generator using a HuggingFace transformer model.

- **Data layer (Supabase)**
  - Supabase Storage: raw files.
  - `pgvector` for similarity search.
  - Postgres tables for metadata and chunks.

The provided system architecture diagram can be referenced in the **Screenshots** section above (for example, as `docs/system-architecture.png`).

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
  - Base URL for the API:
    - `VITE_API_BASE_URL=http://localhost:4000` for local development.
    - In production, point this at your deployed API (e.g., `https://your-api.example.com`).

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
   - For each subject, upload up to **10** **PDF/TXT** files.
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

### Deployment Notes

- **Frontend (`apps/web`)**
  - Can be deployed on platforms like Vercel or Netlify.
  - Build:

    ```bash
    npm run build --workspace apps/web
    ```

  - Serve the generated `dist` directory.
  - Configure `VITE_API_BASE_URL` in the hosting provider’s environment settings to point at your API.

- **Backend (`apps/api`)**
  - Designed as a long‑running Node/Express server.
  - Build:

    ```bash
    npm run build --workspace apps/api
    ```

  - Start:

    ```bash
    npm start --workspace apps/api
    ```

  - Deploy on any Node platform (Railway, Render, Fly.io, a VM, etc.) with the required environment variables.

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
