"use client";

import { useState } from "react";

/** A text field that commits on Enter or blur and cancels on Escape (or when nothing changed). */
export default function InlineInput({
  initial,
  placeholder,
  className = "",
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder?: string;
  className?: string;
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
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`w-full min-w-0 rounded-md bg-bg px-1.5 py-0.5 text-sm outline-none ring-1 ring-link ${className}`}
    />
  );
}
