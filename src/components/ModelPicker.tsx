"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { modelRef, parseModelRef, type ModelInfo } from "@/lib/types";

interface Props {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
  /** Selected model ref ("<providerId>::<modelId>"). */
  value: string | null;
  recent: string[];
  onChange: (modelId: string) => void;
  onRetry: () => void;
}

const MAX_RESULTS = 200;

const refOf = (m: ModelInfo) => modelRef(m.provider_id, m.id);

/** Every whitespace-separated term must appear in the id or provider; earlier matches rank higher. */
function rank(model: ModelInfo, terms: string[]): number {
  const hay = `${model.id} ${model.provider_name} ${model.owned_by ?? ""}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const idx = hay.indexOf(term);
    if (idx < 0) return -1;
    score += idx === 0 ? 0 : hay[idx - 1].match(/[\s/\-_.:]/) ? 1 : 3;
  }
  return score;
}

export default function ModelPicker({ models, loading, error, value, recent, onChange, onRetry }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const sections = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      const recentModels = recent
        .map((ref) => models.find((m) => refOf(m) === ref))
        .filter((m): m is ModelInfo => Boolean(m));
      const rest = models.filter((m) => !recent.includes(refOf(m)));
      return [
        ...(recentModels.length ? [{ label: "Recent", items: recentModels }] : []),
        { label: "All models", items: rest.slice(0, MAX_RESULTS) },
      ];
    }
    const matches = models
      .map((m) => ({ m, score: rank(m, terms) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => a.score - b.score || a.m.id.localeCompare(b.m.id))
      .slice(0, MAX_RESULTS)
      .map((r) => r.m);
    return [{ label: `${matches.length} suggestion${matches.length === 1 ? "" : "s"}`, items: matches }];
  }, [models, query, recent]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function openPicker() {
    setQuery("");
    setHighlight(0);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flat[highlight]) choose(refOf(flat[highlight]));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  let index = -1;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex max-w-[16rem] items-center gap-2 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm hover:bg-hover"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{value ? parseModelRef(value).modelId : loading ? "Loading models…" : "Select a model"}</span>
        <span className="text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-bg shadow-xl">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search models… (e.g. claude sonnet, gpt 4o)"
              className="w-full rounded-md bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
              role="combobox"
              aria-controls="model-listbox"
              aria-expanded
            />
          </div>

          <ul id="model-listbox" ref={listRef} role="listbox" className="max-h-80 overflow-y-auto py-1">
            {error && (
              <li className="whitespace-pre-line px-3 py-3 text-sm text-danger">
                {error}{" "}
                <button className="underline" onClick={onRetry}>
                  Retry
                </button>
              </li>
            )}
            {!error && loading && <li className="px-3 py-3 text-sm text-muted">Loading models…</li>}
            {!error && !loading && flat.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted">No models match “{query}”.</li>
            )}
            {sections.map(
              (section) =>
                section.items.length > 0 && (
                  <li key={section.label}>
                    <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                      {section.label}
                    </div>
                    <ul>
                      {section.items.map((m) => {
                        index += 1;
                        const i = index;
                        const ref = refOf(m);
                        return (
                          <li
                            key={`${section.label}-${ref}`}
                            data-index={i}
                            role="option"
                            aria-selected={ref === value}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => choose(ref)}
                            className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm ${
                              i === highlight ? "bg-hover" : ""
                            }`}
                          >
                            <span className="truncate font-mono text-[13px]">{m.id}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                              {m.provider_name}
                              {ref === value && <span className="text-accent">✓</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
