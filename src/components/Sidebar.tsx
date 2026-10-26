"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { lockApp } from "@/lib/api";
import type { Chat, Collection } from "@/lib/types";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  KeyIcon,
  ListChecksIcon,
  LogOutIcon,
  PanelLeftIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  TrashIcon,
  XIcon,
} from "./icons";

const UNSORTED = "unsorted";

const ROW = "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm";
const ICON_BUTTON = "flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg";
const SECTION_TITLE = "text-[13px] font-semibold";

interface Props {
  collections: Collection[];
  chats: Chat[];
  activeChatId: string | null;
  busy: boolean;
  onOpenChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChats: (ids: string[]) => Promise<void>;
  onMoveChats: (ids: string[], collectionId: string | null) => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  /** Closes the drawer on small screens, collapses the sidebar on wide ones. */
  onHide: () => void;
}

function InlineInput({
  initial,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const commit = () => {
    const v = value.trim();
    if (v && v !== initial) onSubmit(v);
    else onCancel();
  };
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full min-w-0 rounded-md bg-bg px-1.5 py-0.5 text-sm outline-none ring-1 ring-link"
    />
  );
}

function ChatRow({
  chat,
  active,
  selectMode,
  selected,
  dragCount,
  onOpen,
  onToggle,
  onRename,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  selectMode: boolean;
  selected: boolean;
  dragCount: number;
  onOpen: () => void;
  onToggle: (shift: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chat:${chat.id}`,
    data: { chatId: chat.id, title: chat.title, count: dragCount },
    disabled: editing,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (editing) return;
        if (selectMode || e.metaKey || e.ctrlKey) onToggle(e.shiftKey);
        else onOpen();
      }}
      onDoubleClick={() => !selectMode && setEditing(true)}
      className={`group ${ROW} cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-link ${
        isDragging ? "opacity-40" : ""
      } ${selected ? "bg-link/15" : active && !selectMode ? "bg-hover" : "hover:bg-hover"}`}
      title={chat.title}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          readOnly
          tabIndex={-1}
          className="pointer-events-none h-3.5 w-3.5 shrink-0 accent-[var(--link)]"
        />
      )}
      {editing ? (
        <InlineInput
          initial={chat.title}
          onSubmit={(v) => {
            onRename(v);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <span className="flex-1 truncate">{chat.title}</span>
      )}
      {!selectMode && !editing && (
        <span className="-mr-1 hidden shrink-0 gap-0.5 group-hover:flex">
          <button
            type="button"
            title="Rename"
            aria-label="Rename"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className={ICON_BUTTON}
          >
            <PencilIcon width={14} height={14} />
          </button>
          <button
            type="button"
            title="Delete"
            aria-label="Delete"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`${ICON_BUTTON} hover:text-danger`}
          >
            <TrashIcon width={14} height={14} />
          </button>
        </span>
      )}
    </div>
  );
}

function DropZone({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? "bg-link/10 ring-1 ring-link" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Sidebar(props: Props) {
  const {
    collections,
    chats,
    activeChatId,
    busy,
    onOpenChat,
    onNewChat,
    onRenameChat,
    onDeleteChats,
    onMoveChats,
    onCreateCollection,
    onRenameCollection,
    onDeleteCollection,
    onHide,
  } = props;

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [renamingCollection, setRenamingCollection] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [dragging, setDragging] = useState<{ title: string; count: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!footerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Leaving the page now would drop the reply that is still arriving.
  useEffect(() => {
    if (busy) setMenuOpen(false);
  }, [busy]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const visibleChats = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, filter]);

  const groups = useMemo(() => {
    const byCollection = new Map<string, Chat[]>();
    for (const c of visibleChats) {
      const key = c.collection_id ?? UNSORTED;
      if (!byCollection.has(key)) byCollection.set(key, []);
      byCollection.get(key)!.push(c);
    }
    return byCollection;
  }, [visibleChats]);

  // Display order, used for shift-click range selection.
  const orderedIds = useMemo(
    () => [...collections.map((col) => col.id), UNSORTED].flatMap((key) => (groups.get(key) ?? []).map((c) => c.id)),
    [collections, groups],
  );

  function toggle(id: string, shift: boolean) {
    if (!selectMode) setSelectMode(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && lastToggled) {
        const a = orderedIds.indexOf(lastToggled);
        const b = orderedIds.indexOf(id);
        if (a >= 0 && b >= 0) {
          for (const rid of orderedIds.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(rid);
          return next;
        }
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastToggled(id);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setLastToggled(null);
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} chat${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    await onDeleteChats(ids);
    exitSelectMode();
  }

  /** Dragging a selected chat moves the whole selection; otherwise just that chat. */
  function idsForDrag(chatId: string): string[] {
    return selected.has(chatId) ? [...selected] : [chatId];
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { title: string; count: number };
    setDragging({ title: data.title, count: data.count });
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    if (!e.over) return;
    const chatId = (e.active.data.current as { chatId: string }).chatId;
    const target = String(e.over.id).replace(/^drop:/, "");
    const collectionId = target === UNSORTED ? null : target;
    const ids = idsForDrag(chatId).filter(
      (id) => (chats.find((c) => c.id === id)?.collection_id ?? null) !== collectionId,
    );
    if (ids.length) onMoveChats(ids, collectionId);
    if (collectionId) setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(collectionId);
      return next;
    });
  }

  function renderChats(list: Chat[]) {
    return list.map((chat) => (
      <ChatRow
        key={chat.id}
        chat={chat}
        active={chat.id === activeChatId}
        selectMode={selectMode}
        selected={selected.has(chat.id)}
        dragCount={idsForDrag(chat.id).length}
        onOpen={() => onOpenChat(chat.id)}
        onToggle={(shift) => toggle(chat.id, shift)}
        onRename={(title) => onRenameChat(chat.id, title)}
        onDelete={() => {
          if (confirm(`Delete “${chat.title}”?`)) void onDeleteChats([chat.id]);
        }}
      />
    ));
  }

  const unsorted = groups.get(UNSORTED) ?? [];

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-divider bg-sidebar">
      <div className="flex items-center gap-1.5 px-2 pb-3 pt-2.5">
        <button
          type="button"
          onClick={onHide}
          aria-label="Close sidebar"
          title="Close sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
        >
          <PanelLeftIcon />
        </button>
        <span className="truncate font-serif text-xl tracking-tight">OpenAI Chatbot</span>
      </div>

      <div className="space-y-0.5 px-1.5">
        <button
          type="button"
          onClick={onNewChat}
          disabled={busy}
          className={`${ROW} disabled:opacity-50 ${activeChatId === null ? "bg-hover" : "hover:bg-hover"}`}
        >
          <PlusIcon className="shrink-0" />
          New chat
        </button>
        <label className={`${ROW} cursor-text hover:bg-hover focus-within:bg-hover`}>
          <SearchIcon className="shrink-0" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Search"
            aria-label="Search chats"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg focus:placeholder:text-subtle"
          />
          {filter && (
            <button type="button" onClick={() => setFilter("")} aria-label="Clear search" className={`${ICON_BUTTON} -mr-1`}>
              <XIcon width={14} height={14} />
            </button>
          )}
        </label>
      </div>

      {selectMode && (
        <div className="mx-1.5 mt-3 space-y-2 rounded-lg bg-panel p-2 text-xs">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-muted">{selected.size} selected</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="hover:underline"
                onClick={() => setSelected(selected.size === orderedIds.length ? new Set() : new Set(orderedIds))}
              >
                {selected.size === orderedIds.length && orderedIds.length > 0 ? "None" : "All"}
              </button>
              <button type="button" className="hover:underline" onClick={exitSelectMode}>
                Done
              </button>
            </div>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  onMoveChats([...selected], v === UNSORTED ? null : v);
                }}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-xs"
              >
                <option value="">Move to…</option>
                <option value={UNSORTED}>No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={deleteSelected}
                className="rounded-md bg-danger/15 px-2.5 py-1 font-medium text-danger hover:bg-danger/25"
              >
                Delete ({selected.size})
              </button>
            </div>
          )}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-1.5 pb-3">
          {/* Collections */}
          <section>
            <div className="flex items-center justify-between py-1 pl-2.5 pr-1.5">
              <span className={SECTION_TITLE}>Collections</span>
              <button type="button" title="New collection" aria-label="New collection" onClick={() => setCreatingCollection(true)} className={ICON_BUTTON}>
                <FolderPlusIcon width={14} height={14} />
              </button>
            </div>

            {creatingCollection && (
              <div className="px-2.5 py-1">
                <InlineInput
                  initial=""
                  placeholder="Collection name"
                  onSubmit={(name) => {
                    onCreateCollection(name);
                    setCreatingCollection(false);
                  }}
                  onCancel={() => setCreatingCollection(false)}
                />
              </div>
            )}

            {collections.length === 0 && !creatingCollection && (
              <p className="px-2.5 py-1 text-[13px] text-muted">Create a collection, then drag chats into it.</p>
            )}

            <div className="space-y-0.5">
              {collections.map((col) => {
                const items = groups.get(col.id) ?? [];
                const isCollapsed = collapsed.has(col.id);
                return (
                  <DropZone key={col.id} id={col.id}>
                    <div className={`group ${ROW} gap-1.5 pl-1.5 hover:bg-hover`}>
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(col.id)) next.delete(col.id);
                            else next.add(col.id);
                            return next;
                          })
                        }
                        className="flex h-5 w-5 shrink-0 items-center justify-center text-muted hover:text-fg"
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? <ChevronRightIcon width={14} height={14} /> : <ChevronDownIcon width={14} height={14} />}
                      </button>
                      <FolderIcon className="shrink-0 text-muted" />
                      {renamingCollection === col.id ? (
                        <InlineInput
                          initial={col.name}
                          onSubmit={(name) => {
                            onRenameCollection(col.id, name);
                            setRenamingCollection(null);
                          }}
                          onCancel={() => setRenamingCollection(null)}
                        />
                      ) : (
                        <span className="flex-1 truncate" onDoubleClick={() => setRenamingCollection(col.id)}>
                          {col.name}
                        </span>
                      )}
                      <span className="text-xs text-muted group-hover:hidden">{items.length}</span>
                      <span className="-mr-1 hidden gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          title="Rename collection"
                          aria-label="Rename collection"
                          onClick={() => setRenamingCollection(col.id)}
                          className={ICON_BUTTON}
                        >
                          <PencilIcon width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete collection"
                          aria-label="Delete collection"
                          onClick={() => {
                            if (confirm(`Delete collection “${col.name}”? Its chats will be kept and moved out.`))
                              onDeleteCollection(col.id);
                          }}
                          className={`${ICON_BUTTON} hover:text-danger`}
                        >
                          <TrashIcon width={14} height={14} />
                        </button>
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="ml-[17px] space-y-0.5 border-l border-divider pl-1.5">
                        {items.length ? (
                          renderChats(items)
                        ) : (
                          <p className="px-2.5 py-1 text-[13px] text-muted">Drop chats here</p>
                        )}
                      </div>
                    )}
                  </DropZone>
                );
              })}
            </div>
          </section>

          {/* Chats without a collection */}
          <section>
            <DropZone id={UNSORTED} className="min-h-16 space-y-0.5 pb-2">
              <div className="flex items-center justify-between py-1 pl-2.5 pr-1.5">
                <span className={SECTION_TITLE}>Chats</span>
                {!selectMode && (
                  <button
                    type="button"
                    title="Select chats"
                    aria-label="Select chats"
                    onClick={() => setSelectMode(true)}
                    disabled={chats.length === 0}
                    className={`${ICON_BUTTON} disabled:opacity-40 disabled:hover:bg-transparent`}
                  >
                    <ListChecksIcon width={14} height={14} />
                  </button>
                )}
              </div>
              {unsorted.length ? (
                renderChats(unsorted)
              ) : (
                <p className="px-2.5 py-1 text-sm text-muted">
                  {filter ? "No matching chats." : chats.length ? "All chats are in collections." : "No chats yet."}
                </p>
              )}
            </DropZone>
          </section>
        </nav>

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm shadow-lg">
              <span className="max-w-52 truncate">{dragging.title}</span>
              {dragging.count > 1 && <span className="rounded-full bg-link px-1.5 text-xs text-white">+{dragging.count - 1}</span>}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div ref={footerRef} className="relative border-t border-divider p-1.5">
        {menuOpen && (
          <div role="menu" className="absolute inset-x-1.5 bottom-full mb-1 rounded-xl border border-raised bg-panel p-1.5 shadow-2xl">
            <Link role="menuitem" href="/settings#providers" className={`${ROW} hover:bg-active`}>
              <KeyIcon className="shrink-0" />
              API providers
            </Link>
            <Link role="menuitem" href="/settings#security" className={`${ROW} hover:bg-active`}>
              <ShieldIcon className="shrink-0" />
              Security
            </Link>
            <div className="mx-2.5 my-1.5 h-px bg-raised" />
            <button role="menuitem" type="button" onClick={() => void lockApp()} className={`${ROW} hover:bg-active`}>
              <LogOutIcon className="shrink-0" />
              Lock app
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={busy ? "Settings are available once the reply finishes" : undefined}
          className={`${ROW} h-10 px-2 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${menuOpen ? "bg-hover" : ""}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-muted">
            <SettingsIcon width={14} height={14} />
          </span>
          <span className="flex-1 text-left">Settings</span>
          <ChevronDownIcon width={14} height={14} className={`text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </aside>
  );
}
