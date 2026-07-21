create extension if not exists vector with schema extensions;

create table if not exists public.word_embeddings (
  word text primary key check (char_length(word) between 1 and 80),
  pos text not null,
  frequency integer not null default 0,
  embedding extensions.vector(1536) not null
);

alter table public.word_embeddings enable row level security;
revoke all on table public.word_embeddings from anon, authenticated;
grant select, insert, update on table public.word_embeddings to service_role;

create index if not exists word_embeddings_embedding_idx
  on public.word_embeddings using hnsw (embedding vector_cosine_ops);

create or replace function public.match_word_embeddings(
  query_embedding extensions.vector(1536),
  match_count integer default 100
)
returns table (word text, pos text, frequency integer, similarity real)
language sql stable security definer
set search_path = public, extensions
as $$
  select word_embeddings.word, word_embeddings.pos, word_embeddings.frequency,
    (1 - (word_embeddings.embedding <=> query_embedding))::real as similarity
  from public.word_embeddings
  order by word_embeddings.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 100);
$$;

revoke all on function public.match_word_embeddings(extensions.vector(1536), integer) from public, anon, authenticated;
grant execute on function public.match_word_embeddings(extensions.vector(1536), integer) to service_role;
