-- User-added, OpenAI-compatible API providers (Settings → Providers).
-- Keys are only read server-side by the API routes, using the caller's own session, so RLS still applies.

create table if not exists public.providers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  base_url     text not null check (base_url ~* '^https?://'),
  api_key      text not null default '',
  has_api_key  boolean generated always as (api_key <> '') stored,
  created_at   timestamptz not null default now()
);

create index if not exists providers_user_idx on public.providers (user_id, created_at);

alter table public.providers enable row level security;

drop policy if exists "own providers" on public.providers;
create policy "own providers" on public.providers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
