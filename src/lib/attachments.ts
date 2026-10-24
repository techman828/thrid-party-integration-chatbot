import type { Attachment } from "./types";

export const ATTACHMENT_BUCKET = "attachments";
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // matches the bucket's file_size_limit
export const MAX_ATTACHMENTS = 10;

export type AttachmentKind = "image" | "audio" | "video" | "text" | "document";

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "jsonl", "xml", "yaml", "yml", "toml", "ini", "log", "html", "htm",
  "css", "js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "rb", "go", "rs", "java", "kt", "c", "h", "cpp", "hpp", "cs",
  "php", "swift", "sh", "bash", "sql", "r", "lua", "scala", "dart", "vue", "svelte",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", flac: "audio/flac", aac: "audio/aac",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** The browser's MIME type, or one inferred from the extension when it reports none. */
export function mimeTypeFor(name: string, reported: string): string {
  if (reported) return reported;
  const ext = extension(name);
  if (TEXT_EXTENSIONS.has(ext)) return "text/plain";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export function attachmentKind({ name, type }: Pick<Attachment, "name" | "type">): AttachmentKind {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (
    type.startsWith("text/") ||
    /^application\/(json|xml|x-yaml|yaml|javascript|x-sh|sql)/.test(type) ||
    TEXT_EXTENSIONS.has(extension(name))
  ) {
    return "text";
  }
  return "document";
}

/** Audio formats OpenAI's `input_audio` part accepts. */
export function inputAudioFormat({ name, type }: Pick<Attachment, "name" | "type">): "wav" | "mp3" | null {
  if (/wav/.test(type) || extension(name) === "wav") return "wav";
  if (/mpeg|mp3/.test(type) || extension(name) === "mp3") return "mp3";
  return null;
}

/**
 * OpenAI models want PDFs as `file` parts and audio as `input_audio`. Gemini (and most other gateways'
 * models) ignore or reject `file` parts but read any media type sent as an `image_url` data URL.
 */
export function isOpenAIModel(modelId: string): boolean {
  return /^(gpt|o\d|chatgpt)/i.test(modelId);
}

/** Attachment kinds a model is known to drop or reject. Text files are inlined and work everywhere. */
function unsupportedKinds(modelId: string): AttachmentKind[] {
  if (/claude/i.test(modelId)) return ["document", "audio", "video"];
  if (isOpenAIModel(modelId)) return ["video"];
  return [];
}

export function unsupportedAttachments<T extends Pick<Attachment, "name" | "type">>(modelId: string, attachments: T[]): T[] {
  const kinds = unsupportedKinds(modelId);
  return attachments.filter((a) => kinds.includes(attachmentKind(a)));
}

/** A user-facing explanation for `unsupportedAttachments`. */
export function unsupportedMessage(modelId: string, files: Pick<Attachment, "name">[]): string {
  const names = files.map((f) => `“${f.name}”`).join(", ");
  const hint = /claude/i.test(modelId)
    ? "it reads images and text files only here"
    : "it can’t read video";
  return `${modelId} can’t open ${names} (${hint}). Pick a Gemini model for video, or a GPT/Gemini model for documents and audio.`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
