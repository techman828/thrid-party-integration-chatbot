"use client";

import { TEMPLATES, templateVars, type Template } from "@/lib/templates";
import { setTemplate, useTemplate } from "@/lib/useTemplate";

const line = "h-1.5 rounded-full bg-muted/35";

/** A miniature of the chat screen, drawn with the template's own tokens scoped to this element. */
function Preview({ template }: { template: Template }) {
  const { layout } = template;
  const bubble = (side: "user" | "bot", width: string) => {
    const user = side === "user";
    if (!user && layout.messages === "plain") {
      return (
        <div className="space-y-1">
          <div className={`${line} w-11/12`} />
          <div className={`${line} w-3/4`} />
        </div>
      );
    }
    const edge = layout.messages === "bars" ? (user ? "border-r-2 border-r-fg" : "border-l-2 border-l-accent") : "";
    const align = user && layout.messages !== "thread" ? "self-end" : "self-start";
    return (
      <div className={`flex items-center gap-1 ${align} ${width}`}>
        {layout.avatars && !user && <span className="btn-primary h-2.5 w-2.5 shrink-0 rounded-full" />}
        <div
          className={`h-4 flex-1 ${edge ? `rounded-[2px] ${edge}` : "rounded-[min(var(--tpl-radius),6px)]"} ${
            user ? "bg-user" : "border border-bot-border bg-bot"
          }`}
        />
      </div>
    );
  };

  return (
    <div
      style={templateVars(template) as React.CSSProperties}
      className={`h-40 overflow-hidden font-sans text-fg ${layout.frame ? "tpl-canvas p-2.5" : "bg-bg"}`}
    >
      <div className={`flex h-full overflow-hidden bg-bg ${layout.frame ? "rounded-lg shadow-lg" : ""}`}>
        <div className={`flex w-[30%] shrink-0 ${layout.sidebar === "floating" ? "p-1" : ""}`}>
          <div
            className={`tpl-sidebar flex flex-1 flex-col gap-1.5 bg-panel p-1.5 ${
              layout.sidebar === "floating" ? "rounded-md border border-border" : "border-r border-border"
            } ${layout.sidebarPattern === "grid" ? "pattern-grid" : ""}`}
          >
            <div className="btn-primary h-3 rounded-[min(var(--tpl-radius),6px)]" />
            <div className={`${line} mt-1 w-4/5`} />
            <div className={`${line} w-3/5`} />
            <div className={`${line} w-4/5`} />
            <div className={`${line} w-2/3`} />
          </div>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-1.5 p-2 ${layout.mainPattern === "none" ? "" : `pattern-${layout.mainPattern}`}`}>
          {bubble("user", "w-1/2")}
          {bubble("bot", "w-4/5")}
          {bubble("user", "w-2/5")}
          <div
            className={`mt-auto flex items-center justify-end rounded-[min(var(--tpl-radius),8px)] border border-border bg-panel p-0.5 ${
              layout.composer === "docked" ? "" : "shadow-sm"
            } ${layout.composer === "card" ? "h-6 items-end" : "h-4"}`}
          >
            <span className={`btn-primary h-2.5 ${layout.send === "icon" ? "w-2.5 rounded-full" : "w-5 rounded-sm"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatePicker() {
  const active = useTemplate();
  return (
    <div role="radiogroup" aria-label="Template" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {TEMPLATES.map((t) => {
        const selected = t.id === active.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTemplate(t.id)}
            className={`overflow-hidden rounded-xl border bg-bg text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected ? "border-accent ring-2 ring-accent" : "border-border"
            }`}
          >
            <Preview template={t} />
            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t.name}</span>
                {selected ? (
                  <span className="btn-primary rounded-full px-2 py-0.5 text-[11px] font-medium">Active</span>
                ) : (
                  <span className="text-[11px] text-muted">{t.followSystem ? "Light / dark" : t.scheme === "dark" ? "Dark" : "Light"}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted">{t.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
