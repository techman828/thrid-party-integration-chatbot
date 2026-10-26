"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { modelRef, parseModelRef, type ModelInfo } from "@/lib/types";
import { CheckIcon, SearchIcon } from "./icons";

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
const MENU_WIDTH = 416;

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
  /** Opens upwards when the picker sits low on the screen (the composer at the bottom of a chat). */
  const [placement, setPlacement] = useState({ up: false, listHeight: 320, shift: 0 });
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
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const up = below < 240 && rect.top > below;
      // The menu is right-aligned with the button; on narrow screens, slide it right to keep a 16px margin.
      const width = Math.min(MENU_WIDTH, window.innerWidth - 32);
      setPlacement({
        up,
        // The list scrolls within the room left after the search box and margins.
        listHeight: Math.max(160, Math.min(320, (up ? rect.top : below) - 72)),
        shift: Math.max(0, 16 - (rect.right - width)),
      });
    }
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
  const current = value ? models.find((m) => refOf(m) === value) : undefined;

  return (
    <div ref={rootRef} className="relative flex min-w-0">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`flex h-8 max-w-[18rem] min-w-0 items-center gap-1.5 rounded-lg px-2 text-sm hover:bg-raised ${open ? "bg-raised" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{value ? parseModelRef(value).modelId : loading ? "Loading models…" : "Select a model"}</span>
        {current && <span className="hidden shrink-0 text-muted sm:inline">{current.provider_name}</span>}
      </button>

      {open && (
        <div
          style={{ width: MENU_WIDTH, right: -placement.shift }}
          className={`absolute z-30 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-raised bg-panel shadow-2xl ${
            placement.up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-raised px-3.5">
            <SearchIcon className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search models… (e.g. claude sonnet, gpt 4o)"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-subtle"
              role="combobox"
              aria-controls="model-listbox"
              aria-expanded
            />
          </div>

          <ul
            id="model-listbox"
            ref={listRef}
            role="listbox"
            style={{ maxHeight: placement.listHeight }}
            className="overflow-y-auto p-1.5"
          >
            {error && (
              <li className="whitespace-pre-line px-2.5 py-2 text-sm text-danger">
                {error}{" "}
                <button className="underline" onClick={onRetry}>
                  Retry
                </button>
              </li>
            )}
            {!error && loading && <li className="px-2.5 py-2 text-sm text-muted">Loading models…</li>}
            {!error && !loading && flat.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-muted">No models match “{query}”.</li>
            )}
            {sections.map(
              (section) =>
                section.items.length > 0 && (
                  <li key={section.label}>
                    <div className="px-2.5 pb-1 pt-2 text-xs text-muted">
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
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 ${
                              i === highlight ? "bg-active" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{m.id}</span>
                              <span className="block truncate text-xs text-muted">{m.provider_name}</span>
                            </span>
                            {ref === value && <CheckIcon width={18} height={18} className="shrink-0 text-link" />}
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
