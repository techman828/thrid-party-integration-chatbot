-- Lets a user override the built-in OneProvider key/base URL from Settings.
-- A row with builtin_id set is an override, not a separate provider; at most one per user per builtin.

alter table public.providers
  add column if not exists builtin_id text check (builtin_id in ('oneprovider'));

create unique index if not exists providers_user_builtin_idx
  on public.providers (user_id, builtin_id) where builtin_id is not null;
