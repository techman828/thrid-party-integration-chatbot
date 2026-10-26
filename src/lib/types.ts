export type Role = "system" | "user" | "assistant";

export type ResponseMode = "stream" | "complete";

export interface Collection {
  id: string;
  name: string;
  created_at: string;
}

export interface Chat {
  id: string;
  collection_id: string | null;
  title: string;
  model: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  content: string;
  model: string | null;
  attachments: Attachment[];
  created_at: string;
}

/** A file stored in the `attachments` bucket and referenced by a message. */
export interface Attachment {
  /** Storage path: "<user id>/<chat id>/<uuid>-<name>". */
  path: string;
  name: string;
  /** MIME type. */
  type: string;
  size: number;
}

/** OneProvider, configured by the server env; each user can override its key/base URL in Settings. */
export const BUILTIN_PROVIDER_ID = "oneprovider";
export const BUILTIN_DEFAULT_BASE_URL = "https://api.oneprovider.dev/v1";

export interface Provider {
  id: string;
  name: string;
  base_url: string;
  has_api_key: boolean;
  created_at: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
  provider_id: string;
  provider_name: string;
}

/**
 * Models are stored and selected as "<providerId>::<modelId>" so identical ids from different
 * providers stay distinct. Older rows hold a bare model id, which always meant OneProvider.
 */
export function modelRef(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`;
}

export function parseModelRef(ref: string): { providerId: string; modelId: string } {
  const sep = ref.indexOf("::");
  return sep < 0
    ? { providerId: BUILTIN_PROVIDER_ID, modelId: ref }
    : { providerId: ref.slice(0, sep), modelId: ref.slice(sep + 2) };
}

export function normalizeModelRef(ref: string): string {
  const { providerId, modelId } = parseModelRef(ref);
  return modelRef(providerId, modelId);
}

export interface ChatTurn {
  role: Role;
  content: string;
  attachments?: Attachment[];
}
