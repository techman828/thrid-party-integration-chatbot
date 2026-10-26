-- Pinned chats are listed in their own sidebar section, above collections.

alter table public.chats
  add column if not exists pinned boolean not null default false;
