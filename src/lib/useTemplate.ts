"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_STORAGE_KEY, applyTemplate, templateById, type Template } from "./templates";

const listeners = new Set<() => void>();
let current: string | null = null;

function readSaved(): string {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return raw ? templateById(JSON.parse(raw)).id : DEFAULT_TEMPLATE_ID;
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

function getSnapshot(): string {
  return (current ??= readSaved());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in step when the template changes in one of them.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== TEMPLATE_STORAGE_KEY) return;
    current = readSaved();
    applyTemplate(templateById(current), document.documentElement);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Switches the whole app to a template right away and remembers it in this browser. */
export function setTemplate(id: string) {
  const template = templateById(id);
  current = template.id;
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template.id));
  } catch {
    // Storage unavailable (private mode) — the choice lasts until the page is reloaded.
  }
  applyTemplate(template, document.documentElement);
  listeners.forEach((l) => l());
}

/** The active template. The server render (and hydration) uses the default, then switches to the saved one. */
export function useTemplate(): Template {
  return templateById(useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_TEMPLATE_ID));
}
