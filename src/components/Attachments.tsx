"use client";

import { useEffect, useMemo, useState } from "react";
import { attachmentKind, formatBytes, mimeTypeFor, type AttachmentKind } from "@/lib/attachments";
import { signedAttachmentUrls } from "@/lib/db";
import type { Attachment } from "@/lib/types";

const ICONS: Record<AttachmentKind, string> = {
  image: "🖼",
  audio: "🎵",
  video: "🎬",
  text: "📄",
  document: "📎",
};

function FileChip({
  name,
  size,
  kind,
  href,
  onRemove,
}: {
  name: string;
  size: number;
  kind: AttachmentKind;
  href?: string;
  onRemove?: () => void;
}) {
  const body = (
    <>
      <span className="text-base leading-none">{ICONS[kind]}</span>
      <span className="min-w-0">
        <span className="block max-w-48 truncate text-xs font-medium">{name}</span>
        <span className="block text-[11px] text-muted">{formatBytes(size)}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" download={name} className="flex items-center gap-2 hover:underline">
          {body}
        </a>
      ) : (
        <span className="flex items-center gap-2">{body}</span>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="ml-1 text-muted hover:text-danger">
          ✕
        </button>
      )}
    </div>
  );
}

/** Files picked in the composer, before they are sent. */
export function PendingAttachments({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  const previews = useMemo(
    () => files.map((f) => (mimeTypeFor(f.name, f.type).startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files],
  );
  useEffect(() => () => previews.forEach((url) => url && URL.revokeObjectURL(url)), [previews]);

  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {files.map((file, i) => {
        const preview = previews[i];
        return preview ? (
          <div key={`${file.name}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={preview} alt={file.name} className="h-14 w-14 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${file.name}`}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-fg text-[10px] text-bg"
            >
              ✕
            </button>
          </div>
        ) : (
          <FileChip
            key={`${file.name}-${i}`}
            name={file.name}
            size={file.size}
            kind={attachmentKind({ name: file.name, type: mimeTypeFor(file.name, file.type) })}
            onRemove={() => onRemove(i)}
          />
        );
      })}
    </div>
  );
}

/** Stored attachments on a sent message, shown inline (image/audio/video) or as download chips. */
export function MessageAttachments({ attachments, align = "end" }: { attachments: Attachment[]; align?: "start" | "end" }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = attachments.map((a) => a.path).join("|");

  useEffect(() => {
    let cancelled = false;
    signedAttachmentUrls(key.split("|"))
      .then((map) => !cancelled && setUrls(map))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <div className={`flex flex-col gap-2 ${align === "end" ? "items-end" : "items-start"}`}>
      {attachments.map((a) => {
        const url = urls[a.path];
        const kind = attachmentKind(a);
        if (url && kind === "image") {
          return (
            <a key={a.path} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={url} alt={a.name} className="max-h-64 max-w-full rounded-xl border border-border object-contain" />
            </a>
          );
        }
        if (url && kind === "video") {
          return <video key={a.path} src={url} controls preload="metadata" className="max-h-72 max-w-full rounded-xl border border-border" />;
        }
        if (url && kind === "audio") {
          return (
            <div key={a.path} className={`flex flex-col gap-1 ${align === "end" ? "items-end" : "items-start"}`}>
              <audio src={url} controls preload="metadata" className="max-w-full" />
              <span className="text-[11px] text-muted">{a.name}</span>
            </div>
          );
        }
        return <FileChip key={a.path} name={a.name} size={a.size} kind={kind} href={url} />;
      })}
    </div>
  );
}
