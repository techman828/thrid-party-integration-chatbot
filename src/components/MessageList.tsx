"use client";

import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseModelRef, type Message } from "@/lib/types";
import { SUGGESTIONS, type TemplateLayout } from "@/lib/templates";
import { useTemplate } from "@/lib/useTemplate";
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

function Avatar({ role }: { role: Message["role"] }) {
  return role === "user" ? (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-panel text-[11px] font-semibold text-muted">
      You
    </span>
  ) : (
    <span className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm shadow-sm">✦</span>
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

/** Bubble classes for each message style. Plain replies have no bubble of their own. */
const BUBBLE: Record<TemplateLayout["messages"], { user: string; assistant: string }> = {
  plain: {
    user: "rounded-tpl bg-user px-4 py-2.5 text-user-fg",
    assistant: "",
  },
  bubbles: {
    user: "rounded-tpl bg-user px-4 py-2.5 text-user-fg",
    assistant: "rounded-tpl border border-bot-border bg-bot px-4 py-2.5 text-bot-fg",
  },
  bars: {
    user: "rounded-tpl border-r-4 border-r-fg bg-user px-4 py-2.5 text-user-fg shadow-sm",
    assistant: "rounded-tpl border-l-4 border-l-accent bg-bot px-4 py-2.5 text-bot-fg shadow-sm",
  },
  thread: {
    user: "rounded-tpl bg-user px-4 py-2.5 text-user-fg",
    assistant: "rounded-tpl border border-bot-border bg-bot px-4 py-3 text-bot-fg",
  },
};

interface ItemProps extends Pick<Message, "role" | "content" | "model" | "attachments"> {
  /** Set while this reply is being generated: what to say until the first text arrives. */
  waiting?: string;
}

function MessageItem({ role, content, model, attachments, waiting }: ItemProps) {
  const { layout } = useTemplate();
  const user = role === "user";
  const thread = layout.messages === "thread";
  const generating = waiting !== undefined;
  const modelName = model ? parseModelRef(model).modelId : null;

  const body = user ? (
    <div className="whitespace-pre-wrap">{content}</div>
  ) : content ? (
    <div className={`markdown ${generating ? "cursor" : ""}`}>
      <Markdown text={content} />
    </div>
  ) : (
    <TypingDots label={waiting ?? ""} />
  );
  const bubble = (user ? content : content || generating) && (
    <div className={`max-w-full ${BUBBLE[layout.messages][user ? "user" : "assistant"]}`}>{body}</div>
  );
  const files = attachments.length > 0 && <MessageAttachments attachments={attachments} align={user && !thread ? "end" : "start"} />;
  const footer = !user && (
    <div className="flex items-center gap-3">
      {modelName && !thread && <span className="font-mono text-xs text-muted">{modelName}</span>}
      {!generating && <CopyButton text={content} />}
    </div>
  );

  if (thread) {
    return (
      <div className="group flex gap-3">
        {layout.avatars && <Avatar role={role} />}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <div className={`pt-1.5 text-xs font-semibold ${user ? "text-fg" : "text-accent"}`}>{user ? "You" : (modelName ?? "Assistant")}</div>
          {files}
          {bubble}
          {footer}
        </div>
      </div>
    );
  }

  // A plain reply spans the full width; everything else hugs its content.
  const width = user || layout.messages !== "plain" ? "max-w-[85%]" : "flex-1";
  return (
    <div className={`group flex items-start gap-2.5 ${user ? "flex-row-reverse" : ""}`}>
      {layout.avatars && <Avatar role={role} />}
      <div className={`flex min-w-0 flex-col gap-2 ${user ? "items-end" : "items-start"} ${width}`}>
        {files}
        {bubble}
        {footer}
      </div>
    </div>
  );
}

function Welcome({ onSuggest }: { onSuggest?: (text: string) => void }) {
  const template = useTemplate();
  const { welcome } = template.layout;
  const title = template.welcomeTitle ?? "What can I help with?";

  if (welcome === "plain") {
    return (
      <div className="mt-[18vh] text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Pick a model above, choose Stream or Complete, and send a message.</p>
      </div>
    );
  }

  if (welcome === "chips") {
    return (
      <div className="mt-[14vh] flex flex-col items-center text-center">
        <span className="text-3xl text-accent">✦</span>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-10 text-xs font-medium text-muted">Suggestions on what to ask</p>
        <div className="mt-3 flex max-w-xl flex-wrap justify-center gap-2">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              disabled={!onSuggest}
              onClick={() => onSuggest?.(s)}
              className="rounded-tpl border border-border bg-panel px-3 py-2 text-sm shadow-sm hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[10vh]">
      <h1 className="text-center text-4xl font-bold tracking-tight">{title}</h1>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={!onSuggest}
            onClick={() => onSuggest?.(s)}
            className="rounded-tpl border-l-2 border-l-accent bg-panel px-4 py-3 text-left text-sm shadow-sm hover:bg-hover disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MessageList({
  messages,
  pending,
  loading,
  onSuggest,
}: {
  messages: Message[];
  pending: PendingReply | null;
  loading: boolean;
  /** Sends a suggested prompt from the empty-chat screen; omitted while sending isn't possible. */
  onSuggest?: (text: string) => void;
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

        {!loading && messages.length === 0 && !pending && <Welcome onSuggest={onSuggest} />}

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
