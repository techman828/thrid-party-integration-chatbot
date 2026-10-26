"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import ModelPicker from "./ModelPicker";
import ModeToggle from "./ModeToggle";
import MessageList, { type PendingReply } from "./MessageList";
import Composer, { type ComposerHandle } from "./Composer";
import { Greeting, Suggestions } from "./Welcome";
import ChatMenu from "./ChatMenu";
import ConfirmDialog, { type ConfirmRequest } from "./ConfirmDialog";
import InlineInput from "./InlineInput";
import { ChevronDownIcon, PanelLeftIcon } from "./icons";
import * as db from "@/lib/db";
import { sendChat } from "@/lib/api";
import { mimeTypeFor, unsupportedAttachments, unsupportedMessage } from "@/lib/attachments";
import { ensureSession, supabaseConfigured } from "@/lib/supabase";
import {
  modelRef,
  normalizeModelRef,
  parseModelRef,
  type Chat,
  type Collection,
  type Message,
  type ResponseMode,
} from "@/lib/types";
import { useProviders } from "@/lib/useProviders";

const LS_MODEL = "chat.model";
const LS_MODE = "chat.mode";
const LS_RECENT = "chat.recentModels";
/** Per tab, so coming back from Settings reopens the chat you were in. */
const SS_ACTIVE_CHAT = "chat.activeChat";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode) — preferences just won't persist.
  }
}

function titleFrom(text: string): string {
  const line = text.split("\n").find((l) => l.trim()) ?? "New chat";
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export default function ChatApp() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const { models, modelsLoading, modelsError, error: providersError, reloadModels } = useProviders();
  /** Selected model ref ("<providerId>::<modelId>"). */
  const [model, setModel] = useState<string | null>(null);
  const [recentModels, setRecentModels] = useState<string[]>([]);
  const [mode, setMode] = useState<ResponseMode>("stream");

  const [pending, setPending] = useState<PendingReply | null>(null);
  /** The drawer on small screens. */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Collapsed on wide screens. */
  const [sidebarHidden, setSidebarHidden] = useState(false);
  /** The title dropdown in the header. */
  const [titleMenu, setTitleMenu] = useState<HTMLElement | null>(null);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  const composerRef = useRef<ComposerHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChatId;
  const restoredRef = useRef(false);

  const sending = pending !== null;
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  /** Nothing to show yet: the greeting, composer and suggestions sit together in the middle. */
  const landing = !loadingMessages && messages.length === 0 && !pending;

  // Restore preferences (older versions stored bare OneProvider model ids).
  useEffect(() => {
    const saved = readLocal<string | null>(LS_MODEL, null);
    setModel(saved ? normalizeModelRef(saved) : null);
    setMode(readLocal<ResponseMode>(LS_MODE, "stream"));
    setRecentModels(readLocal<string[]>(LS_RECENT, []).map(normalizeModelRef));
  }, []);

  // Once every provider has answered, fall back to the first model if nothing (valid) is selected.
  useEffect(() => {
    if (modelsLoading || !models.length) return;
    if (!model || !models.some((m) => modelRef(m.provider_id, m.id) === model)) {
      setModel(modelRef(models[0].provider_id, models[0].id));
    }
  }, [models, model, modelsLoading]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setFatal(
        "Supabase is not configured. Copy .env.example to .env.local, fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the dev server.",
      );
      return;
    }
    (async () => {
      try {
        await ensureSession();
        const [cols, chatList] = await Promise.all([db.listCollections(), db.listChats()]);
        setCollections(cols);
        setChats(chatList);
        setReady(true);
      } catch (err) {
        setFatal((err as Error).message);
      }
    })();
  }, []);

  // Reopen the chat that was open before visiting Settings, once the chat list has loaded.
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(SS_ACTIVE_CHAT);
    } catch {
      // Storage unavailable — start on a new chat.
    }
    if (last && chats.some((c) => c.id === last)) void openChat(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when `ready` first turns true
  }, [ready]);

  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      if (activeChatId) sessionStorage.setItem(SS_ACTIVE_CHAT, activeChatId);
      else sessionStorage.removeItem(SS_ACTIVE_CHAT);
    } catch {
      // Storage unavailable — nothing to remember.
    }
  }, [activeChatId]);

  function chooseModel(id: string) {
    setModel(id);
    writeLocal(LS_MODEL, id);
    setRecentModels((prev) => {
      const next = [id, ...prev.filter((m) => m !== id)].slice(0, 5);
      writeLocal(LS_RECENT, next);
      return next;
    });
  }

  function chooseMode(m: ResponseMode) {
    setMode(m);
    writeLocal(LS_MODE, m);
  }

  async function openChat(id: string) {
    if (sending || id === activeChatId) return;
    setActiveChatId(id);
    setSidebarOpen(false);
    setError(null);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const list = await db.listMessages(id);
      if (activeChatRef.current === id) setMessages(list);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (activeChatRef.current === id) setLoadingMessages(false);
    }
    const chat = chats.find((c) => c.id === id);
    const chatModel = chat?.model ? normalizeModelRef(chat.model) : null;
    if (chatModel && models.some((m) => modelRef(m.provider_id, m.id) === chatModel)) setModel(chatModel);
  }

  function newChat() {
    if (sending) return;
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    setSidebarOpen(false);
  }

  async function send(text: string, files: File[] = []) {
    if (!model) {
      setError("Select a model first.");
      return;
    }
    const usedModel = model;
    const unsupported = unsupportedAttachments(
      parseModelRef(usedModel).modelId,
      files.map((f) => ({ name: f.name, type: mimeTypeFor(f.name, f.type) })),
    );
    if (unsupported.length) {
      setError(unsupportedMessage(parseModelRef(usedModel).modelId, unsupported));
      return;
    }
    setError(null);
    let chat = activeChat;

    try {
      if (!chat) {
        chat = await db.createChat(titleFrom(text || files[0]?.name || "New chat"), usedModel);
        const created = chat;
        setChats((prev) => [created, ...prev]);
        setActiveChatId(created.id);
        activeChatRef.current = created.id;
      }
      const history = activeChat ? messages : [];
      // Show the reply placeholder right away; uploads can take a moment.
      setPending({ model: usedModel, text: mode === "stream" ? "" : null });
      const chatId = chat.id;
      const uploaded = await Promise.allSettled(files.map((f) => db.uploadAttachment(chatId, f)));
      const failed = uploaded.find((r): r is PromiseRejectedResult => r.status === "rejected");
      const attachments = uploaded.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      if (failed) {
        await db.removeAttachments(attachments.map((a) => a.path)).catch(() => {});
        throw failed.reason;
      }
      const userMsg = await db.addMessage(chat.id, "user", text, null, attachments);
      const conversation = [...history, userMsg];
      setMessages(conversation);

      const controller = new AbortController();
      abortRef.current = controller;
      let reply = "";
      try {
        reply = await sendChat({
          model: usedModel,
          messages: conversation.map(({ role, content, attachments }) => ({ role, content, attachments })),
          mode,
          signal: controller.signal,
          onDelta: (t) => setPending({ model: usedModel, text: t }),
        });
      } catch (err) {
        const e = err as Error & { partial?: string };
        if (e.name === "AbortError") reply = e.partial ?? "";
        else setError(e.message);
      } finally {
        abortRef.current = null;
      }

      if (reply) {
        const assistantMsg = await db.addMessage(chat.id, "assistant", reply, usedModel);
        if (activeChatRef.current === chat.id) setMessages((prev) => [...prev, assistantMsg]);
      }

      const now = new Date().toISOString();
      await db.updateChat(chatId, { model: usedModel, updated_at: now });
      setChats((prev) => sortChats(prev.map((c) => (c.id === chatId ? { ...c, model: usedModel, updated_at: now } : c))));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  const isWide = () => window.matchMedia("(min-width: 768px)").matches;

  function showSidebar() {
    if (isWide()) setSidebarHidden(false);
    else setSidebarOpen(true);
  }

  function hideSidebar() {
    if (isWide()) setSidebarHidden(true);
    else setSidebarOpen(false);
  }

  async function renameChat(id: string, title: string) {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await db.updateChat(id, { title });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function togglePin(id: string, pinned: boolean) {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
    try {
      await db.updateChat(id, { pinned });
    } catch (err) {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !pinned } : c)));
      setError((err as Error).message);
    }
  }

  async function deleteChats(ids: string[]) {
    try {
      await db.deleteChats(ids);
      setChats((prev) => prev.filter((c) => !ids.includes(c.id)));
      if (activeChatId && ids.includes(activeChatId)) newChat();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function moveChats(ids: string[], collectionId: string | null) {
    const before = chats;
    setChats((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, collection_id: collectionId } : c)));
    try {
      await db.moveChats(ids, collectionId);
    } catch (err) {
      setChats(before);
      setError((err as Error).message);
    }
  }

  async function createCollection(name: string) {
    try {
      const col = await db.createCollection(name);
      setCollections((prev) => [...prev, col]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function renameCollection(id: string, name: string) {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    try {
      await db.renameCollection(id, name);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteCollection(id: string) {
    try {
      await db.deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setChats((prev) => prev.map((c) => (c.collection_id === id ? { ...c, collection_id: null } : c)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const fatalMessage = fatal ?? providersError;
  if (fatalMessage) {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-border bg-panel p-6">
          <h1 className="text-lg font-semibold">Can’t start the app</h1>
          <p className="mt-2 text-sm text-muted">{fatalMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Mobile backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarHidden ? "md:hidden" : ""}`}
      >
        <Sidebar
          collections={collections}
          chats={chats}
          activeChatId={activeChatId}
          busy={sending}
          onOpenChat={openChat}
          onNewChat={newChat}
          onRenameChat={renameChat}
          onTogglePin={togglePin}
          onDeleteChats={deleteChats}
          onMoveChats={moveChats}
          onCreateCollection={createCollection}
          onRenameCollection={renameCollection}
          onDeleteCollection={deleteCollection}
          onHide={hideSidebar}
        />
      </div>

      {/* The composer keeps its place among main's children, so it stays mounted (and focused) when the first message is sent. */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            onClick={showSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg ${
              sidebarHidden ? "" : "md:hidden"
            }`}
          >
            <PanelLeftIcon />
          </button>
          {activeChat &&
            (renamingTitle ? (
              <div className="w-72 max-w-full">
                <InlineInput
                  key={activeChat.id}
                  initial={activeChat.title}
                  onSubmit={(title) => {
                    void renameChat(activeChat.id, title);
                    setRenamingTitle(false);
                  }}
                  onCancel={() => setRenamingTitle(false)}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  const anchor = e.currentTarget;
                  setTitleMenu((open) => (open ? null : anchor));
                }}
                aria-haspopup="menu"
                aria-expanded={titleMenu !== null}
                className={`flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm hover:bg-hover ${titleMenu ? "bg-hover" : ""}`}
              >
                <h2 className="min-w-0 truncate">{activeChat.title}</h2>
                <ChevronDownIcon width={14} height={14} className="shrink-0 text-muted" />
              </button>
            ))}
        </header>

        {activeChat && titleMenu && (
          <ChatMenu
            chat={activeChat}
            collections={collections}
            anchor={titleMenu}
            align="start"
            canDelete={!sending}
            onClose={() => setTitleMenu(null)}
            onTogglePin={() => void togglePin(activeChat.id, !activeChat.pinned)}
            onRename={() => setRenamingTitle(true)}
            onMove={(collectionId) => void moveChats([activeChat.id], collectionId)}
            onDelete={() =>
              setConfirmRequest({
                title: "Delete chat?",
                message: "Are you sure you want to delete this chat?",
                onConfirm: () => deleteChats([activeChat.id]),
              })
            }
          />
        )}
        {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />}

        {landing ? (
          <Greeting className="mt-auto" />
        ) : (
          <MessageList messages={messages} pending={pending} loading={loadingMessages} />
        )}

        {error && (
          <div className="px-4">
            <div
              className={`mx-auto mb-2 flex w-full items-start justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger ${
                landing ? "max-w-2xl" : "max-w-3xl"
              }`}
            >
              <span className="break-words">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                ✕
              </button>
            </div>
          </div>
        )}

        <Composer
          ref={composerRef}
          landing={landing}
          onSend={send}
          onStop={stop}
          sending={sending}
          disabled={!ready || !model}
          placeholder={!ready ? "Connecting…" : landing ? "How can I help you today?" : "Reply…"}
          toolbarStart={<ModeToggle value={mode} onChange={chooseMode} disabled={sending} />}
          toolbarEnd={
            <ModelPicker
              models={models}
              loading={modelsLoading}
              error={modelsError}
              value={model}
              recent={recentModels}
              onChange={chooseModel}
              onRetry={reloadModels}
            />
          }
        />

        {landing && <Suggestions className="mb-auto pb-[10vh]" onPick={(prompt) => composerRef.current?.prefill(prompt)} />}
      </main>
    </div>
  );
}
