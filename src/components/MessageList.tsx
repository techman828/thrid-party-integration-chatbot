"use client";

import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseModelRef, type Message } from "@/lib/types";
import { MessageAttachments } from "./Attachments";

export interface PendingReply {
  model: string;
  /** Text streamed so far; null while waiting in "complete" mode. */
  text: string | null;
}

const Markdown = memo(function Markdown({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="text-xs text-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm opacity-70">
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
      </span>
      {label}
    </div>
  );
}

interface ItemProps extends Pick<Message, "role" | "content" | "model" | "attachments"> {
  /** Set while this reply is being generated: what to say until the first text arrives. */
  waiting?: string;
}

function MessageItem({ role, content, model, attachments, waiting }: ItemProps) {
  const user = role === "user";
  const generating = waiting !== undefined;
  const modelName = model ? parseModelRef(model).modelId : null;

  return (
    <div className={`group flex ${user ? "justify-end" : ""}`}>
      <div className={`flex min-w-0 flex-col gap-2 ${user ? "max-w-[85%] items-end" : "flex-1 items-start"}`}>
        {attachments.length > 0 && <MessageAttachments attachments={attachments} align={user ? "end" : "start"} />}
        {user ? (
          content && <div className="max-w-full whitespace-pre-wrap rounded-2xl bg-panel px-4 py-2.5">{content}</div>
        ) : content ? (
          <div className={`markdown max-w-full ${generating ? "cursor" : ""}`}>
            <Markdown text={content} />
          </div>
        ) : (
          waiting !== undefined && <TypingDots label={waiting} />
        )}
        {!user && (
          <div className="flex items-center gap-3">
            {modelName && <span className="font-mono text-xs text-muted">{modelName}</span>}
            {!generating && <CopyButton text={content} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  pending,
  loading,
}: {
  messages: Message[];
  pending: PendingReply | null;
  loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {loading && <p className="text-center text-sm text-muted">Loading conversation…</p>}

        {messages.map((m) => (
          <MessageItem key={m.id} role={m.role} content={m.content} model={m.model} attachments={m.attachments ?? []} />
        ))}

        {pending && (
          <MessageItem
            role="assistant"
            content={pending.text ?? ""}
            model={pending.model}
            attachments={[]}
            waiting={pending.text === null ? "Generating full response…" : "Waiting for first token…"}
          />
        )}
      </div>
    </div>
  );
}
