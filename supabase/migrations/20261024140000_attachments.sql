-- File attachments on messages (documents, images, audio, video).
-- Files live in the private `attachments` bucket under "<user id>/<chat id>/…"; each message keeps
-- [{ path, name, type, size }] so the API route can fetch them (as the caller) and send them to the model.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400) -- 25 MiB
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "own attachments select" on storage.objects;
create policy "own attachments select" on storage.objects
  for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own attachments insert" on storage.objects;
create policy "own attachments insert" on storage.objects
  for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own attachments delete" on storage.objects;
create policy "own attachments delete" on storage.objects
  for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
