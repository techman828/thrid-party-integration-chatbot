"use client";

import { useEffect, useRef, useState } from "react";
import { PendingAttachments } from "./Attachments";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, formatBytes } from "@/lib/attachments";
import { useTemplate } from "@/lib/useTemplate";

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

export default function Composer({
  onSend,
  onStop,
  sending,
  disabled,
  placeholder,
}: {
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  sending: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const template = useTemplate();
  const { composer, send: sendStyle } = template.layout;

  useEffect(() => {
    const el = ref.current;
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

  const attachButton = (
    <>
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
        className="rounded-tpl px-2.5 py-2 text-lg leading-none text-muted hover:bg-hover hover:text-fg disabled:opacity-40"
      >
        📎
      </button>
    </>
  );

  const textarea = (
    <textarea
      ref={ref}
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
      rows={composer === "card" ? 2 : 1}
      placeholder={
        dragOver
          ? "Drop files to attach"
          : (placeholder ?? template.placeholder ?? "Send a message…  (Shift+Enter for a new line)")
      }
      className="max-h-60 w-full flex-1 resize-none bg-transparent px-2 py-1.5 outline-none placeholder:text-muted"
    />
  );

  const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";
  const sendButton = sending ? (
    <button
      type="button"
      onClick={onStop}
      aria-label="Stop generating"
      className={sendStyle === "icon" ? `${iconButton} border border-border hover:bg-hover` : "rounded-tpl border border-border px-4 py-2 text-sm hover:bg-hover"}
    >
      {sendStyle === "icon" ? <span className="h-3 w-3 rounded-sm bg-fg" /> : "Stop"}
    </button>
  ) : (
    <button
      type="submit"
      disabled={(!text.trim() && files.length === 0) || disabled}
      aria-label="Send"
      className={`btn-primary shadow-sm disabled:opacity-40 ${
        sendStyle === "icon" ? iconButton : "flex items-center gap-1.5 rounded-tpl px-4 py-2 text-sm font-medium"
      }`}
    >
      {sendStyle === "icon" ? <SendIcon /> : composer === "card" ? <>Send <SendIcon /></> : "Send"}
    </button>
  );

  return (
    <div className={composer === "docked" ? "border-t border-border bg-bg px-4 pb-4 pt-3" : "px-4 pb-5 pt-2"}>
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
        className={`mx-auto max-w-3xl rounded-tpl border bg-panel focus-within:ring-2 focus-within:ring-accent ${
          dragOver ? "border-accent ring-2 ring-accent" : "border-border"
        } ${composer === "docked" ? "p-2" : composer === "floating" ? "p-2 shadow-lg" : "p-3 shadow-sm"}`}
      >
        <PendingAttachments files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))} />
        {fileError && <p className="px-2 pb-2 text-xs text-danger">{fileError}</p>}

        {composer === "card" ? (
          <>
            {textarea}
            <div className="flex items-center justify-between gap-2 pt-1">
              {attachButton}
              {sendButton}
            </div>
          </>
        ) : (
          <div className="flex items-end gap-2">
            {attachButton}
            {textarea}
            {sendButton}
          </div>
        )}
      </form>
    </div>
  );
}
