"use client";

import { useState } from "react";
import { Logo } from "./Logo";

const INPUT =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none placeholder:text-subtle focus:border-subtle";

export default function UnlockPage({
  mode,
  next,
  setupError,
}: {
  /** "create" when no platform password exists yet. */
  mode: "enter" | "create";
  next: string;
  setupError: string | null;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = mode === "create";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError("Enter the password.");
    if (creating && password.length < 8) return setError("The password must be at least 8 characters.");
    if (creating && password !== confirm) return setError("The passwords don’t match.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, create: creating }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Request failed with status ${res.status}`);
      // A full navigation, so the middleware sees the new cookie.
      window.location.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 text-fg">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-panel p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="font-serif text-2xl font-light tracking-tight">{creating ? "Set a password" : "Enter password"}</h1>
            <p className="mt-1 text-sm text-muted">
              {creating
                ? "Choose the password everyone will need to open this app. You can change it later in Settings."
                : "This app is password protected."}
            </p>
          </div>
        </div>

        {setupError ? (
          <p className="text-sm text-danger">{setupError}</p>
        ) : (
          <>
            <label className="block text-xs text-muted">
              {creating ? "New password" : "Password"}
              <input
                autoFocus
                type="password"
                autoComplete={creating ? "new-password" : "current-password"}
                className={`${INPUT} mt-1`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {creating && (
              <label className="block text-xs text-muted">
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  className={`${INPUT} mt-1`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-fg px-3 py-2 text-sm font-medium text-bg hover:bg-white disabled:opacity-50"
            >
              {busy ? "Checking…" : creating ? "Set password and continue" : "Unlock"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
