import { getSupabase } from "./supabase";
import { ATTACHMENT_BUCKET, mimeTypeFor } from "./attachments";
import { BUILTIN_PROVIDER_ID, type Chat, type Collection, type Attachment, type Message, type Provider, type Role } from "./types";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// Collections

export async function listCollections(): Promise<Collection[]> {
  return unwrap(
    await getSupabase().from("collections").select("id, name, created_at").order("created_at"),
  );
}

export async function createCollection(name: string): Promise<Collection> {
  return unwrap(
    await getSupabase().from("collections").insert({ name }).select("id, name, created_at").single(),
  );
}

export async function renameCollection(id: string, name: string): Promise<void> {
  unwrap(await getSupabase().from("collections").update({ name }).eq("id", id));
}

/** Chats inside the collection are kept and moved out (FK is `on delete set null`). */
export async function deleteCollection(id: string): Promise<void> {
  unwrap(await getSupabase().from("collections").delete().eq("id", id));
}

// Chats

const CHAT_COLUMNS = "id, collection_id, title, model, pinned, created_at, updated_at";

export async function listChats(): Promise<Chat[]> {
  return unwrap(
    await getSupabase()
      .from("chats")
      .select(CHAT_COLUMNS)
      .order("updated_at", { ascending: false }),
  );
}

export async function createChat(title: string, model: string | null): Promise<Chat> {
  return unwrap(
    await getSupabase().from("chats").insert({ title, model }).select(CHAT_COLUMNS).single(),
  );
}

export async function updateChat(
  id: string,
  patch: Partial<Pick<Chat, "title" | "model" | "collection_id" | "pinned" | "updated_at">>,
): Promise<void> {
  unwrap(await getSupabase().from("chats").update(patch).eq("id", id));
}

export async function moveChats(ids: string[], collectionId: string | null): Promise<void> {
  if (ids.length === 0) return;
  unwrap(await getSupabase().from("chats").update({ collection_id: collectionId }).in("id", ids));
}

export async function deleteChats(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = getSupabase();
  const rows: Array<{ attachments: Attachment[] }> = unwrap(
    await supabase.from("messages").select("attachments").in("chat_id", ids).neq("attachments", "[]"),
  );
  unwrap(await supabase.from("chats").delete().in("id", ids));
  const paths = rows.flatMap((r) => r.attachments.map((a) => a.path));
  // Best effort: a leftover file is harmless, and the chats are already gone.
  if (paths.length) await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
}

// Messages

const MESSAGE_COLUMNS = "id, chat_id, role, content, model, attachments, created_at";

export async function listMessages(chatId: string): Promise<Message[]> {
  return unwrap(
    await getSupabase()
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("chat_id", chatId)
      .order("created_at"),
  );
}

export async function addMessage(
  chatId: string,
  role: Role,
  content: string,
  model: string | null,
  attachments: Attachment[] = [],
): Promise<Message> {
  return unwrap(
    await getSupabase()
      .from("messages")
      .insert({ chat_id: chatId, role, content, model, attachments })
      .select(MESSAGE_COLUMNS)
      .single(),
  );
}

// Attachments

/** Uploads a file into this user's folder for the chat (RLS requires the first path segment to be the user id). */
export async function uploadAttachment(chatId: string, file: File): Promise<Attachment> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not signed in; reload the page and try again.");

  const type = mimeTypeFor(file.name, file.type);
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100) || "file";
  const path = `${userId}/${chatId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: type });
  if (error) throw new Error(`Upload of “${file.name}” failed: ${error.message}`);
  return { path, name: file.name, type, size: file.size };
}

export async function removeAttachments(paths: string[]): Promise<void> {
  if (paths.length) await getSupabase().storage.from(ATTACHMENT_BUCKET).remove(paths);
}

/** Short-lived URLs for showing stored attachments, keyed by path. */
export async function signedAttachmentUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await getSupabase().storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(error.message);
  const urls: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}

// Providers (the API key is write-only from the browser; only the API routes read it)

const PROVIDER_COLUMNS = "id, name, base_url, has_api_key, created_at";

export async function listProviders(): Promise<Provider[]> {
  return unwrap(
    await getSupabase().from("providers").select(PROVIDER_COLUMNS).is("builtin_id", null).order("created_at"),
  );
}

/** This user's Settings override for OneProvider's key/base URL, if any (reset it with `deleteProvider`). */
export async function getBuiltinOverride(): Promise<Provider | null> {
  return unwrap(
    await getSupabase().from("providers").select(PROVIDER_COLUMNS).eq("builtin_id", BUILTIN_PROVIDER_ID).maybeSingle(),
  );
}

export async function createBuiltinOverride(input: { base_url: string; api_key: string }): Promise<Provider> {
  return unwrap(
    await getSupabase()
      .from("providers")
      .insert({ ...input, name: "OneProvider", builtin_id: BUILTIN_PROVIDER_ID })
      .select(PROVIDER_COLUMNS)
      .single(),
  );
}

export async function createProvider(input: { name: string; base_url: string; api_key: string }): Promise<Provider> {
  return unwrap(await getSupabase().from("providers").insert(input).select(PROVIDER_COLUMNS).single());
}

/** Omit `api_key` to keep the stored key. */
export async function updateProvider(
  id: string,
  patch: { name?: string; base_url?: string; api_key?: string },
): Promise<Provider> {
  return unwrap(
    await getSupabase().from("providers").update(patch).eq("id", id).select(PROVIDER_COLUMNS).single(),
  );
}

export async function deleteProvider(id: string): Promise<void> {
  unwrap(await getSupabase().from("providers").delete().eq("id", id));
}
