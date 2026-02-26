-- Enable pgvector
create extension if not exists vector;

-- Users are managed by Supabase auth; we scope everything by auth.uid()

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint fk_subjects_user
    foreign key (user_id) references auth.users (id) on delete cascade
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references subjects (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  page_count integer,
  created_at timestamptz not null default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references subjects (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  file_name text not null,
  page_range text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(384) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_subjects_user on subjects (user_id);
create index if not exists idx_documents_user_subject on documents (user_id, subject_id);
create index if not exists idx_chunks_user_subject on chunks (user_id, subject_id);
create index if not exists idx_chunks_document on chunks (document_id);

-- RPC: match_chunks
-- Given a user_id, subject_id, and query embedding, return top-k similar chunks.

create or replace function match_chunks(
  p_user_id uuid,
  p_subject_id uuid,
  query_embedding vector(384),
  match_count int default 10
)
returns table (
  id uuid,
  document_id uuid,
  file_name text,
  page_range text,
  chunk_index integer,
  content text,
  similarity float4
) as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.file_name,
    c.page_range,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.user_id = p_user_id
    and c.subject_id = p_subject_id
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$ language plpgsql stable;

