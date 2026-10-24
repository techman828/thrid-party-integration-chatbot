"use client";

import Link from "next/link";
import { useState } from "react";
import TemplatePicker from "./TemplatePicker";
import { supabaseConfigured } from "@/lib/supabase";
import { BUILTIN_DEFAULT_BASE_URL, BUILTIN_PROVIDER_ID, type Provider } from "@/lib/types";
import { useProviders, type ProviderInput, type ProviderStatus } from "@/lib/useProviders";

/** Common OpenAI-compatible endpoints, to save typing. */
const PRESETS: Array<{ name: string; base_url: string }> = [
  { name: "OpenAI", base_url: "https://api.openai.com/v1" },
  { name: "OpenRouter", base_url: "https://openrouter.ai/api/v1" },
  { name: "Groq", base_url: "https://api.groq.com/openai/v1" },
  { name: "Mistral", base_url: "https://api.mistral.ai/v1" },
  { name: "DeepSeek", base_url: "https://api.deepseek.com/v1" },
  { name: "Together AI", base_url: "https://api.together.xyz/v1" },
  { name: "Ollama (local)", base_url: "http://localhost:11434/v1" },
];

const INPUT =
  "w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent";

function StatusLine({ status }: { status?: ProviderStatus }) {
  if (!status || status.loading) return <span className="text-muted">Checking…</span>;
  if (status.error) return <span className="break-words text-danger">{status.error}</span>;
  if (!status.configured) return <span className="text-muted">No API key yet. Click Edit to add one.</span>;
  return (
    <span className="text-muted">
      {status.count} model{status.count === 1 ? "" : "s"} available
    </span>
  );
}

function ProviderForm({
  initial,
  builtin = false,
  onSave,
  onCancel,
}: {
  initial: Provider | null;
  /** Editing OneProvider: the name is fixed and no presets are offered. */
  builtin?: boolean;
  onSave: (input: ProviderInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? (builtin ? "OneProvider" : ""));
  const [baseUrl, setBaseUrl] = useState(initial?.base_url ?? (builtin ? BUILTIN_DEFAULT_BASE_URL : ""));
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const url = baseUrl.trim().replace(/\/+$/, "");
    if (!name.trim()) return setError("Give the provider a name.");
    if (!/^https?:\/\/\S+$/i.test(url)) return setError("The base URL must start with http:// or https://.");
    if (builtin && !initial?.has_api_key && !apiKey.trim()) return setError("Enter your OneProvider API key.");
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        base_url: url,
        // On edit, a blank key field means "keep the current key".
        ...(initial && !apiKey ? {} : { api_key: apiKey.trim() }),
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-panel p-3">
      {!initial && !builtin && (
        <label className="block text-xs text-muted">
          Preset
          <select
            className={`${INPUT} mt-1`}
            defaultValue=""
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.name === e.target.value);
              if (preset) {
                setName(preset.name);
                setBaseUrl(preset.base_url);
              }
            }}
          >
            <option value="">Custom…</option>
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {!builtin && (
        <label className="block text-xs text-muted">
          Name
          <input autoFocus className={`${INPUT} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. OpenAI" maxLength={60} />
        </label>
      )}
      <label className="block text-xs text-muted">
        Base URL
        <input
          className={`${INPUT} mt-1 font-mono`}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com/v1"
          inputMode="url"
        />
        <span className="mt-1 block">
          OpenAI-compatible root: the app calls <code>/models</code> and <code>/chat/completions</code> under it.
        </span>
      </label>
      <label className="block text-xs text-muted">
        API key
        <input
          autoFocus={builtin}
          type="password"
          autoComplete="off"
          className={`${INPUT} mt-1 font-mono`}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            initial?.has_api_key
              ? "Leave blank to keep the saved key"
              : builtin
                ? "Your OneProvider API key"
                : "sk-… (leave blank if none is needed)"
          }
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm hover:bg-hover">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {saving ? "Saving…" : initial || builtin ? "Save" : "Add provider"}
        </button>
      </div>
    </form>
  );
}


function ProvidersSection() {
  const {
    providers,
    builtinOverride,
    status,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    refreshProvider,
    saveBuiltin,
    resetBuiltin: resetBuiltinProvider,
  } = useProviders();
  // "new" for the add form, a provider id (or BUILTIN_PROVIDER_ID) while editing it, null otherwise.
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function resetBuiltin() {
    if (!confirm("Remove your saved OneProvider key and go back to the server’s key from .env.local?")) return;
    setDeleteError(null);
    try {
      await resetBuiltinProvider();
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  }

  async function remove(p: Provider) {
    if (!confirm(`Remove “${p.name}”? Its saved API key is deleted too.`)) return;
    setDeleteError(null);
    try {
      await deleteProvider(p.id);
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  }

  if (!supabaseConfigured || error) {
    return (
      <p className="rounded-lg border border-border bg-panel p-4 text-sm text-muted">
        {error ?? "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border bg-bg">
        {editing === BUILTIN_PROVIDER_ID ? (
          <li className="p-2">
            <ProviderForm
              builtin
              initial={builtinOverride}
              onSave={async (input) => {
                await saveBuiltin(input);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </li>
        ) : (
          <li className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="font-medium">
                OneProvider <span className="ml-1 rounded bg-hover px-1.5 py-0.5 text-[11px] font-normal text-muted">built-in</span>
              </div>
              <div className="truncate text-xs text-muted">
                {builtinOverride ? (
                  <>
                    Your key · <span className="font-mono">{builtinOverride.base_url}</span>
                  </>
                ) : (
                  "Server key from .env.local"
                )}
              </div>
              <div className="mt-0.5 text-xs">
                <StatusLine status={status[BUILTIN_PROVIDER_ID]} />
              </div>
            </div>
            <div className="flex shrink-0 gap-1 text-xs">
              <button type="button" onClick={() => refreshProvider(BUILTIN_PROVIDER_ID)} className="rounded-md px-2 py-1 hover:bg-hover">
                Refresh
              </button>
              <button type="button" onClick={() => setEditing(BUILTIN_PROVIDER_ID)} className="rounded-md px-2 py-1 hover:bg-hover">
                Edit
              </button>
              {builtinOverride && (
                <button type="button" onClick={resetBuiltin} className="rounded-md px-2 py-1 text-danger hover:bg-hover" title="Use the server key from .env.local again">
                  Reset
                </button>
              )}
            </div>
          </li>
        )}

        {providers.map((p) =>
          editing === p.id ? (
            <li key={p.id} className="p-2">
              <ProviderForm
                initial={p}
                onSave={async (input) => {
                  await updateProvider(p.id, input);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="truncate font-mono text-xs text-muted">{p.base_url}</div>
                <div className="mt-0.5 text-xs">
                  {!p.has_api_key && <span className="mr-2 text-muted">No API key ·</span>}
                  <StatusLine status={status[p.id]} />
                </div>
              </div>
              <div className="flex shrink-0 gap-1 text-xs">
                <button type="button" onClick={() => refreshProvider(p.id)} className="rounded-md px-2 py-1 hover:bg-hover">
                  Refresh
                </button>
                <button type="button" onClick={() => setEditing(p.id)} className="rounded-md px-2 py-1 hover:bg-hover">
                  Edit
                </button>
                <button type="button" onClick={() => remove(p)} className="rounded-md px-2 py-1 text-danger hover:bg-hover">
                  Remove
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {deleteError && <p className="text-sm text-danger">{deleteError}</p>}

      {editing === "new" ? (
        <ProviderForm
          initial={null}
          onSave={async (input) => {
            await createProvider(input);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted hover:bg-hover hover:text-fg"
        >
          + Add provider
        </button>
      )}
    </div>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !next) return setMessage({ ok: false, text: "Enter the current and the new password." });
    if (next.length < 8) return setMessage({ ok: false, text: "The new password must be at least 8 characters." });
    if (next !== confirmNext) return setMessage({ ok: false, text: "The new passwords don’t match." });
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Request failed with status ${res.status}`);
      setCurrent("");
      setNext("");
      setConfirmNext("");
      setMessage({ ok: true, text: "Password changed." });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function lock() {
    await fetch("/api/lock", { method: "DELETE" });
    window.location.replace("/unlock");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-panel p-3">
        <label className="block text-xs text-muted">
          Current password
          <input type="password" autoComplete="current-password" className={`${INPUT} mt-1`} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block text-xs text-muted">
          New password
          <input type="password" autoComplete="new-password" className={`${INPUT} mt-1`} value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" />
        </label>
        <label className="block text-xs text-muted">
          Confirm new password
          <input type="password" autoComplete="new-password" className={`${INPUT} mt-1`} value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} />
        </label>
        {message && <p className={`text-sm ${message.ok ? "text-muted" : "text-danger"}`}>{message.text}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
      <button
        type="button"
        onClick={lock}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-hover hover:text-fg"
      >
        Lock now
      </button>
    </div>
  );
}

const SECTIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "providers", label: "API providers" },
  { id: "security", label: "Security" },
];

export default function SettingsPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="rounded-md px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg">
            ← Back to chat
          </Link>
          <h1 className="text-base font-semibold">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 md:flex md:gap-10">
        <nav className="mb-6 flex gap-1 md:sticky md:top-20 md:mb-0 md:w-44 md:shrink-0 md:flex-col md:self-start">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-hover hover:text-fg">
              {s.label}
            </a>
          ))}
        </nav>

        <main className="min-w-0 flex-1 space-y-12">
          <section id="appearance" className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="mt-0.5 text-sm text-muted">
                Pick a template to restyle the whole app. The change applies right away and is remembered in this browser.
              </p>
            </div>
            <TemplatePicker />
          </section>

          <section id="providers" className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">API providers</h2>
              <p className="mt-0.5 text-sm text-muted">
                Models from every provider below appear in the model picker. Keys are stored in your Supabase project and are only used by
                this app’s server.
              </p>
            </div>
            <ProvidersSection />
          </section>

          <section id="security" className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="mt-0.5 text-sm text-muted">
                Everyone has to enter the platform password before they can open the app. It is asked again whenever the browser is
                reopened, and after 12 hours.
              </p>
            </div>
            <SecuritySection />
          </section>
        </main>
      </div>
    </div>
  );
}
