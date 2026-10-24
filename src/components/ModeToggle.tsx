"use client";

import type { ResponseMode } from "@/lib/types";

const OPTIONS: Array<{ value: ResponseMode; label: string; title: string }> = [
  { value: "stream", label: "Stream", title: "Show the response as it is generated" },
  { value: "complete", label: "Complete", title: "Show the response once it has finished" },
];

export default function ModeToggle({
  value,
  onChange,
  disabled,
}: {
  value: ResponseMode;
  onChange: (mode: ResponseMode) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Response display mode" className="flex rounded-lg border border-border bg-panel p-0.5 text-sm">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          title={opt.title}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 transition-colors disabled:opacity-60 ${
            value === opt.value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
