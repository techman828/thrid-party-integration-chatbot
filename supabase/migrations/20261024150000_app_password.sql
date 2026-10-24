-- Platform password: everyone must enter it before reaching the app (see src/middleware.ts).
-- One row holds the bcrypt hash. The table has no RLS policies, so it is only reachable through the
-- security definer functions below, and the hash never leaves the database.

create table if not exists public.app_lock (
  id             boolean primary key default true check (id),
  password_hash  text not null,
  updated_at     timestamptz not null default now()
);

alter table public.app_lock enable row level security;
revoke all on public.app_lock from anon, authenticated;

create or replace function public.app_password_is_set()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.app_lock);
$$;

create or replace function public.verify_app_password(password text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select password_hash = extensions.crypt(password, password_hash) from public.app_lock),
    false
  );
$$;

-- Sets the password. The first time, current_password is ignored; after that it must match.
-- Returns false when current_password is wrong (or when another request set the first password first).
create or replace function public.set_app_password(current_password text, new_password text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  existing text;
begin
  if char_length(coalesce(new_password, '')) < 8 then
    raise exception 'The password must be at least 8 characters.';
  end if;

  select password_hash into existing from public.app_lock for update;

  if existing is null then
    insert into public.app_lock (id, password_hash)
    values (true, extensions.crypt(new_password, extensions.gen_salt('bf', 10)))
    on conflict (id) do nothing;
    return found;
  end if;

  if existing <> extensions.crypt(coalesce(current_password, ''), existing) then
    return false;
  end if;

  update public.app_lock
  set password_hash = extensions.crypt(new_password, extensions.gen_salt('bf', 10)), updated_at = now();
  return true;
end;
$$;

revoke all on function public.app_password_is_set() from public;
revoke all on function public.verify_app_password(text) from public;
revoke all on function public.set_app_password(text, text) from public;
grant execute on function public.app_password_is_set() to anon, authenticated;
grant execute on function public.verify_app_password(text) to anon, authenticated;
grant execute on function public.set_app_password(text, text) to anon, authenticated;
