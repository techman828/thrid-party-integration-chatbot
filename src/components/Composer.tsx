"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { PendingAttachments } from "./Attachments";
import { ArrowUpIcon, PlusIcon } from "./icons";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, formatBytes } from "@/lib/attachments";

export interface ComposerHandle {
  /** Replaces the draft with `text` and puts the cursor at its end. */
  prefill: (text: string) => void;
}

export default function Composer({
  ref,
  onSend,
  onStop,
  sending,
  disabled,
  placeholder,
  landing = false,
  toolbarStart,
  toolbarEnd,
}: {
  ref?: React.Ref<ComposerHandle>;
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  sending: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** On the empty-chat screen: narrower, with a taller text area. */
  landing?: boolean;
  /** Controls after the attach button, and before the send button. */
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    prefill(value) {
      setText(value);
      requestAnimationFrame(() => {
        const el = textRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(value.length, value.length);
      });
    },
  }), []);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const tooBig = incoming.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    const ok = incoming.filter((f) => f.size <= MAX_ATTACHMENT_BYTES && f.size > 0);
    const room = MAX_ATTACHMENTS - files.length;
    const errors: string[] = [];
    if (tooBig.length) {
      errors.push(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
    }
    if (ok.length > room) errors.push(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
    setFileError(errors.join(" ") || null);
    setFiles((prev) => [...prev, ...ok.slice(0, Math.max(room, 0))]);
  }

  function submit() {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || sending || disabled) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
    setFileError(null);
  }

  const iconButton = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";

  return (
    <div className={`w-full px-4 ${landing ? "" : "pb-4"}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          if (!sending) addFiles(e.dataTransfer.files);
        }}
        className={`mx-auto w-full rounded-2xl border bg-panel px-3 pb-2 pt-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-colors ${
          landing ? "max-w-2xl" : "max-w-3xl"
        } ${dragOver ? "border-link" : "border-border focus-within:border-subtle"}`}
      >
        <PendingAttachments files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))} />
        {fileError && <p className="px-1 pb-2 text-xs text-danger">{fileError}</p>}

        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          rows={1}
          placeholder={dragOver ? "Drop files to attach" : (placeholder ?? "How can I help you today?")}
          className={`max-h-60 w-full resize-none bg-transparent px-1 outline-none placeholder:text-subtle ${landing ? "min-h-12" : "min-h-7"}`}
        />

        <div className="mt-1.5 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Attach documents, images, audio or video (or drop/paste them here)"
            aria-label="Attach files"
            className={`${iconButton} -ml-1 text-muted hover:bg-hover hover:text-fg disabled:opacity-40`}
          >
            <PlusIcon width={18} height={18} />
          </button>
          {toolbarStart}
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            {toolbarEnd}
            {sending ? (
              <button type="button" onClick={onStop} aria-label="Stop generating" className={`${iconButton} bg-accent hover:brightness-110`}>
                <span className="h-2.5 w-2.5 rounded-[2px] bg-accent-fg" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!text.trim() && files.length === 0) || disabled}
                aria-label="Send"
                className={`${iconButton} bg-accent text-accent-fg hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100`}
              >
                <ArrowUpIcon />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
