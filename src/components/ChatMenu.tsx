"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Chat, Collection } from "@/lib/types";
import { CheckIcon, ChevronRightIcon, FolderIcon, PencilIcon, PinIcon, PinOffIcon, TrashIcon } from "./icons";

const ITEM =
  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none hover:bg-active focus-visible:bg-active disabled:pointer-events-none disabled:opacity-40";
const MENU = "rounded-xl border border-raised bg-panel p-1.5 shadow-2xl";
const MARGIN = 8;

interface Props {
  chat: Chat;
  collections: Collection[];
  /** The button that opened the menu; clicks on it are left to its own toggle. */
  anchor: HTMLElement;
  /** Line the menu up with the anchor's left edge ("start") or right edge ("end"). */
  align?: "start" | "end";
  /** False while this chat's reply is still arriving. */
  canDelete?: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onRename: () => void;
  onMove: (collectionId: string | null) => void;
  onDelete: () => void;
}

/**
 * Actions for one chat, shown in a portal so the sidebar's scroll area doesn't clip it.
 * P, R and D trigger the matching item while the menu is open.
 */
export default function ChatMenu({
  chat,
  collections,
  anchor,
  align = "end",
  canDelete = true,
  onClose,
  onTogglePin,
  onRename,
  onMove,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  const run = (action: () => void) => {
    onClose();
    action();
  };

  // Below the anchor, or above it when there's no room; always inside the viewport.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const r = anchor.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = menu;
    const left = Math.min(Math.max(MARGIN, align === "end" ? r.right - w : r.left), window.innerWidth - w - MARGIN);
    let top = r.bottom + 4;
    if (top + h > window.innerHeight - MARGIN) top = Math.max(MARGIN, r.top - h - 4);
    setPos({ top, left });
    menu.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [anchor, align]);

  useEffect(() => {
    const outside = (target: EventTarget | null) =>
      !ref.current?.contains(target as Node) && !anchor.contains(target as Node);
    const onPointerDown = (e: PointerEvent) => outside(e.target) && onClose();
    const onScroll = (e: Event) => outside(e.target) && onClose();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (moveOpen) setMoveOpen(false);
        else onClose();
        anchor.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)") ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next]?.focus();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "p") run(onTogglePin);
      else if (key === "r") run(onRename);
      else if (key === "d" && canDelete) run(onDelete);
      else return;
      e.preventDefault();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `run` only closes over these props
  }, [anchor, moveOpen, canDelete, onClose, onTogglePin, onRename, onDelete]);

  const hint = (key: string) => <span className="ml-auto text-xs text-subtle">{key}</span>;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${chat.title}`}
      style={pos ?? { visibility: "hidden" }}
      className={`fixed z-50 w-52 ${MENU}`}
    >
      <button role="menuitem" type="button" className={ITEM} onClick={() => run(onTogglePin)}>
        {chat.pinned ? <PinOffIcon className="shrink-0" /> : <PinIcon className="shrink-0" />}
        {chat.pinned ? "Unpin" : "Pin"}
        {hint("P")}
      </button>
      <button role="menuitem" type="button" className={ITEM} onClick={() => run(onRename)}>
        <PencilIcon className="shrink-0" />
        Rename
        {hint("R")}
      </button>
      <div className="relative" onMouseEnter={() => setMoveOpen(true)} onMouseLeave={() => setMoveOpen(false)}>
        <button
          role="menuitem"
          type="button"
          aria-haspopup="menu"
          aria-expanded={moveOpen}
          className={`${ITEM} ${moveOpen ? "bg-active" : ""}`}
          onClick={() => setMoveOpen((o) => !o)}
          onKeyDown={(e) => e.key === "ArrowRight" && setMoveOpen(true)}
        >
          <FolderIcon className="shrink-0" />
          Move to group
          <ChevronRightIcon width={14} height={14} className="ml-auto text-subtle" />
        </button>
        {moveOpen && (
          // pl-1.5 bridges the gap, so the pointer can travel into the submenu without closing it.
          <div className="absolute left-full top-[-7px] pl-1.5">
            <div role="menu" aria-label="Move to group" className={`max-h-72 w-52 overflow-y-auto ${MENU}`}>
              {collections.length === 0 ? (
                <p className="px-2.5 py-1.5 text-sm text-muted">No groups yet. Create one in the sidebar.</p>
              ) : (
                <>
                  {[{ id: null, name: "No group" }, ...collections].map((col) => {
                    const current = (chat.collection_id ?? null) === col.id;
                    return (
                      <button
                        key={col.id ?? "none"}
                        role="menuitem"
                        type="button"
                        className={ITEM}
                        onClick={() => run(() => !current && onMove(col.id))}
                      >
                        <span className={`flex-1 truncate ${col.id ? "" : "text-muted"}`}>{col.name}</span>
                        {current && <CheckIcon width={14} height={14} className="shrink-0 text-link" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mx-2.5 my-1.5 h-px bg-raised" />
      <button
        role="menuitem"
        type="button"
        disabled={!canDelete}
        title={canDelete ? undefined : "Available once the reply finishes"}
        className={`${ITEM} text-danger`}
        onClick={() => run(onDelete)}
      >
        <TrashIcon className="shrink-0" />
        Delete
        {hint("D")}
      </button>
    </div>,
    document.body,
  );
}
