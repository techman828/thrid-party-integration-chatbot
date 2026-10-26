"use client";

import { useEffect, useState } from "react";
import { CodeIcon, CoffeeIcon, GraduationCapIcon, LightbulbIcon, PencilIcon, SparkIcon } from "./icons";

/** Starters offered under the composer on the empty-chat screen. Picking one fills in the message box. */
const SUGGESTIONS = [
  { label: "Write", Icon: PencilIcon, prompt: "Help me write " },
  { label: "Learn", Icon: GraduationCapIcon, prompt: "Explain " },
  { label: "Code", Icon: CodeIcon, prompt: "Help me with this code:\n\n" },
  { label: "Life stuff", Icon: CoffeeIcon, prompt: "Give me advice on " },
  { label: "Brainstorm", Icon: LightbulbIcon, prompt: "Brainstorm ideas for " },
];

function timeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ className = "" }: { className?: string }) {
  // Set after mount: the server doesn't know the visitor's local time.
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(timeOfDay(new Date().getHours())), []);

  return (
    <div className={`flex items-center justify-center gap-3 px-4 pb-8 ${className}`}>
      <SparkIcon className="h-8 w-8 shrink-0 text-accent sm:h-9 sm:w-9" />
      <h1 className="font-serif text-3xl font-light tracking-tight sm:text-[2.5rem] sm:leading-tight">{text ?? " "}</h1>
    </div>
  );
}

export function Suggestions({ onPick, className = "" }: { onPick: (prompt: string) => void; className?: string }) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 px-4 pt-10 ${className}`}>
      {SUGGESTIONS.map(({ label, Icon, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(prompt)}
          className="flex h-7 items-center gap-1.5 rounded-lg bg-raised px-2.5 text-sm hover:bg-hover"
        >
          <Icon className="text-muted" />
          {label}
        </button>
      ))}
    </div>
  );
}
