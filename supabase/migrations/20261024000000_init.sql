-- Initial schema. Apply with `npx supabase db push` (or paste into Dashboard → SQL Editor).
-- Anonymous sign-ins are enabled in supabase/config.toml (`npx supabase config push`).
-- Every row belongs to the signed-in (anonymous) user and is protected by RLS.

create extension if not exists "pgcrypto";

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  created_at  timestamptz not null default now()
);

create table if not exists public.chats (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection_id  uuid references public.collections (id) on delete set null,
  title          text not null default 'New chat',
  model          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chat_id     uuid not null references public.chats (id) on delete cascade,
  role        text not null check (role in ('system', 'user', 'assistant')),
  content     text not null,
  model       text,
  created_at  timestamptz not null default now()
);

create index if not exists chats_user_updated_idx on public.chats (user_id, updated_at desc);
create index if not exists chats_collection_idx on public.chats (collection_id);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at);

alter table public.collections enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

drop policy if exists "own collections" on public.collections;
create policy "own collections" on public.collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own chats" on public.chats;
create policy "own chats" on public.chats
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
