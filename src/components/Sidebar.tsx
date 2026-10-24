"use client";

import { useMemo, useState } from "react";
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
import type { Chat, Collection } from "@/lib/types";
import { useTemplate } from "@/lib/useTemplate";
import { Logo } from "./Logo";

const UNSORTED = "unsorted";

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
      className="w-full min-w-0 rounded bg-bg px-1.5 py-0.5 text-sm outline-none ring-2 ring-accent"
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
      className={`group flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isDragging ? "opacity-40" : ""
      } ${active && !selectMode ? "bg-hover font-medium" : "hover:bg-hover"} ${selected ? "bg-accent/15" : ""}`}
      title={chat.title}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          readOnly
          tabIndex={-1}
          className="pointer-events-none h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
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
        <span className="hidden shrink-0 gap-1 group-hover:flex">
          <button
            type="button"
            title="Rename"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="rounded px-1 text-muted hover:text-fg"
          >
            ✎
          </button>
          <button
            type="button"
            title="Delete"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded px-1 text-muted hover:text-danger"
          >
            ✕
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
      className={`rounded-lg transition-colors ${isOver ? "bg-accent/10 ring-2 ring-accent" : ""} ${className}`}
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
  } = props;

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [renamingCollection, setRenamingCollection] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [dragging, setDragging] = useState<{ title: string; count: number } | null>(null);
  const { layout } = useTemplate();

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
    <aside
      className={`tpl-sidebar flex h-full w-72 shrink-0 flex-col overflow-hidden bg-panel ${
        layout.sidebar === "floating" ? "border-r border-border md:rounded-tpl md:border md:shadow-sm" : "border-r border-border"
      } ${layout.sidebarPattern === "grid" ? "pattern-grid" : ""}`}
    >
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2 px-1 pb-1">
          <Logo className="h-7 w-7" />
          <span className="text-sm font-semibold">OpenAI Chatbot</span>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          disabled={busy}
          className="btn-primary w-full rounded-tpl px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
        >
          + New chat
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search history…"
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Selection toolbar */}
      <div className="flex items-center justify-between gap-2 border-y border-border px-3 py-1.5 text-xs">
        {selectMode ? (
          <>
            <span className="text-muted">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="hover:underline"
                onClick={() =>
                  setSelected(selected.size === orderedIds.length ? new Set() : new Set(orderedIds))
                }
              >
                {selected.size === orderedIds.length && orderedIds.length > 0 ? "None" : "All"}
              </button>
              <button type="button" className="hover:underline" onClick={exitSelectMode}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-muted">History</span>
            <button
              type="button"
              className="hover:underline"
              onClick={() => setSelectMode(true)}
              disabled={chats.length === 0}
            >
              Select
            </button>
          </>
        )}
      </div>

      {selectMode && selected.size > 0 && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
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
            className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white"
          >
            Delete ({selected.size})
          </button>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
        <nav className="flex-1 space-y-3 overflow-y-auto p-2">
          {/* Collections */}
          <section>
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Collections</span>
              <button
                type="button"
                title="New collection"
                onClick={() => setCreatingCollection(true)}
                className="rounded px-1.5 text-muted hover:bg-hover hover:text-fg"
              >
                +
              </button>
            </div>

            {creatingCollection && (
              <div className="px-2 pb-1">
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
              <p className="px-2 py-1 text-xs text-muted">Create a collection, then drag chats into it.</p>
            )}

            <div className="space-y-1">
              {collections.map((col) => {
                const items = groups.get(col.id) ?? [];
                const isCollapsed = collapsed.has(col.id);
                return (
                  <DropZone key={col.id} id={col.id}>
                    <div className="group flex items-center gap-1 rounded-md px-1 py-1 text-sm hover:bg-hover">
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
                        className="w-4 shrink-0 text-xs text-muted"
                        aria-label={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? "▸" : "▾"}
                      </button>
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
                        <span
                          className="flex-1 truncate font-medium"
                          onDoubleClick={() => setRenamingCollection(col.id)}
                        >
                          📁 {col.name}
                        </span>
                      )}
                      <span className="text-xs text-muted group-hover:hidden">{items.length}</span>
                      <span className="hidden gap-1 group-hover:flex">
                        <button
                          type="button"
                          title="Rename collection"
                          onClick={() => setRenamingCollection(col.id)}
                          className="rounded px-1 text-muted hover:text-fg"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Delete collection"
                          onClick={() => {
                            if (confirm(`Delete collection “${col.name}”? Its chats will be kept and moved out.`))
                              onDeleteCollection(col.id);
                          }}
                          className="rounded px-1 text-muted hover:text-danger"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="ml-4 border-l border-border pl-1">
                        {items.length ? (
                          renderChats(items)
                        ) : (
                          <p className="px-2 py-1 text-xs text-muted">Drop chats here</p>
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
            <DropZone id={UNSORTED} className="min-h-16 pb-2">
              <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted">Chats</div>
              {unsorted.length ? (
                renderChats(unsorted)
              ) : (
                <p className="px-2 py-1 text-xs text-muted">
                  {filter ? "No matching chats." : chats.length ? "All chats are in collections." : "No chats yet."}
                </p>
              )}
            </DropZone>
          </section>
        </nav>

        <DragOverlay dropAnimation={null}>
          {dragging && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5 text-sm shadow-lg">
              <span className="max-w-52 truncate">{dragging.title}</span>
              {dragging.count > 1 && (
                <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">+{dragging.count - 1}</span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </aside>
  );
}
