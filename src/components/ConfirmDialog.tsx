"use client";

import { useEffect, useState } from "react";

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/** A small modal asking to confirm a destructive action; Escape or a click outside cancels. */
export default function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && !working && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, working]);

  async function confirm() {
    setWorking(true);
    try {
      await request.onConfirm();
    } finally {
      setWorking(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onPointerDown={() => !working && onClose()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-raised bg-panel p-4 shadow-2xl"
      >
        <h2 id="confirm-title" className="font-semibold">
          {request.title}
        </h2>
        <p id="confirm-message" className="mt-1.5 text-sm text-muted">
          {request.message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            className="rounded-lg bg-active px-3 py-1.5 text-sm font-medium hover:bg-[#5a5a5a] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={confirm}
            disabled={working}
            className="rounded-lg border border-danger/70 px-3 py-1.5 text-sm font-medium text-danger outline-none hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-50"
          >
            {request.confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
