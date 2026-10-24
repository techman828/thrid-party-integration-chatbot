import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ATTACHMENT_BUCKET,
  attachmentKind,
  inputAudioFormat,
  isOpenAIModel,
  unsupportedAttachments,
  unsupportedMessage,
} from "./attachments";
import type { Attachment, ChatTurn } from "./types";

/** Text files are inlined; cap them so one huge log doesn't blow the context window. */
const MAX_TEXT_CHARS = 200_000;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: "wav" | "mp3" } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface UpstreamMessage {
  role: ChatTurn["role"];
  content: string | ContentPart[];
}

/** Paths are only trusted if they sit in the caller's own folder (RLS enforces this again on download). */
function assertOwnPath(path: string, userId: string) {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) throw new Error("Invalid attachment path.");
}

async function partFor(supabase: SupabaseClient, attachment: Attachment, modelId: string): Promise<ContentPart> {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).download(attachment.path);
  if (error || !data) throw new Error(`Couldn’t read “${attachment.name}”: ${error?.message ?? "not found"}`);
  const bytes = Buffer.from(await data.arrayBuffer());

  const kind = attachmentKind(attachment);
  if (kind === "text") {
    let text = bytes.toString("utf8");
    if (text.length > MAX_TEXT_CHARS) text = `${text.slice(0, MAX_TEXT_CHARS)}\n…[truncated]`;
    return { type: "text", text: `File: ${attachment.name}\n\`\`\`\n${text}\n\`\`\`` };
  }

  const base64 = bytes.toString("base64");
  const dataUrl = `data:${attachment.type};base64,${base64}`;
  if (kind === "image" || !isOpenAIModel(modelId)) return { type: "image_url", image_url: { url: dataUrl } };

  const audioFormat = kind === "audio" ? inputAudioFormat(attachment) : null;
  if (audioFormat) return { type: "input_audio", input_audio: { data: base64, format: audioFormat } };
  return { type: "file", file: { filename: attachment.name, file_data: dataUrl } };
}

/**
 * Turns stored chat turns into OpenAI-style messages, downloading attachments with the caller's
 * Supabase session. Turns without attachments keep a plain string `content`.
 */
export async function toUpstreamMessages(
  messages: ChatTurn[],
  modelId: string,
  supabase: SupabaseClient | null,
): Promise<UpstreamMessage[]> {
  const all = messages.flatMap((m) => m.attachments ?? []);
  if (all.length === 0) return messages.map(({ role, content }) => ({ role, content }));

  if (!supabase) throw new Error("Missing session; reload the page and try again.");
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Missing session; reload the page and try again.");

  const unsupported = unsupportedAttachments(modelId, all);
  if (unsupported.length) throw new Error(unsupportedMessage(modelId, unsupported));

  return Promise.all(
    messages.map(async ({ role, content, attachments = [] }) => {
      if (attachments.length === 0) return { role, content };
      attachments.forEach((a) => assertOwnPath(a.path, userId));
      const parts = await Promise.all(attachments.map((a) => partFor(supabase, a, modelId)));
      return { role, content: [...(content ? [{ type: "text" as const, text: content }] : []), ...parts] };
    }),
  );
}
