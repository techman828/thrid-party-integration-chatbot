/**
 * UI templates, picked under Settings → Appearance. A template sets the color tokens used across the app
 * (as CSS custom properties on <html>) and a few layout choices that components read with `useTemplate()`.
 *
 * This module is shared by the server layout (for the no-flash boot script) and client components,
 * so it must stay free of React and browser-only imports.
 */

export const TEMPLATE_STORAGE_KEY = "chat.template";
export const DEFAULT_TEMPLATE_ID = "classic";

export type FontId = "geist" | "inter" | "poppins" | "dm-sans" | "manrope" | "jakarta" | "outfit";

/** CSS variables defined by next/font in app/layout.tsx. */
const FONT_VARS: Record<FontId, string> = {
  geist: "--font-geist-sans",
  inter: "--font-inter",
  poppins: "--font-poppins",
  "dm-sans": "--font-dm-sans",
  manrope: "--font-manrope",
  jakarta: "--font-jakarta",
  outfit: "--font-outfit",
};

interface Palette {
  bg: string;
  panel: string;
  hover: string;
  border: string;
  fg: string;
  muted: string;
}

export interface TemplateColors extends Palette {
  /** Page background around the app when `layout.frame` is on. Any CSS background, gradients included. */
  canvas: string;
  accent: string;
  accentFg: string;
  /** Primary button background. May be a gradient. */
  accentBg: string;
  danger: string;
  userBg: string;
  userFg: string;
  botBg: string;
  botFg: string;
  botBorder: string;
  /** The sidebar's own palette, for e.g. a dark sidebar next to a light chat. */
  sidebar: Palette;
}

export interface TemplateLayout {
  /** Show the app as a rounded card floating on the canvas (desktop only). */
  frame: boolean;
  sidebar: "attached" | "floating";
  /**
   * plain: only the user's messages are in bubbles. bubbles: both sides. bars: bubbles with a colored edge.
   * thread: every message left-aligned under an avatar and name.
   */
  messages: "plain" | "bubbles" | "bars" | "thread";
  avatars: boolean;
  /** docked: full-width bar. floating: raised box over the chat. card: box with a toolbar row under the text. */
  composer: "docked" | "floating" | "card";
  send: "text" | "icon";
  /** Corner radius of bubbles, inputs and buttons, in px. */
  radius: number;
  mainPattern: "none" | "dots" | "glow";
  sidebarPattern: "none" | "grid";
  /** Empty-chat screen: a heading only, suggestion chips, or suggestion cards. */
  welcome: "plain" | "chips" | "cards";
}

export interface Template {
  id: string;
  name: string;
  description: string;
  scheme: "light" | "dark";
  /** Use the stylesheet's tokens, which follow the system light/dark setting. */
  followSystem?: boolean;
  font: FontId;
  colors: TemplateColors;
  layout: TemplateLayout;
  welcomeTitle?: string;
  placeholder?: string;
}

/** Prompts offered on the empty-chat screen by templates with `welcome: "chips" | "cards"`. */
export const SUGGESTIONS = [
  "What can you help me with?",
  "Explain a complex topic in simple terms",
  "Help me debug a piece of code",
  "Draft a polite follow-up email",
  "Summarize the key points of an article",
  "Brainstorm names for a new project",
];

const BASE_LAYOUT: TemplateLayout = {
  frame: false,
  sidebar: "attached",
  messages: "plain",
  avatars: false,
  composer: "docked",
  send: "text",
  radius: 16,
  mainPattern: "none",
  sidebarPattern: "none",
  welcome: "plain",
};

type TemplateInput = Omit<Template, "colors" | "layout"> & {
  colors: Palette &
    Partial<Omit<TemplateColors, keyof Palette | "sidebar">> & { accent: string; sidebar?: Partial<Palette> };
  layout?: Partial<TemplateLayout>;
};

function define({ colors: c, layout, ...rest }: TemplateInput): Template {
  return {
    ...rest,
    colors: {
      ...c,
      canvas: c.canvas ?? c.bg,
      accentFg: c.accentFg ?? "#ffffff",
      accentBg: c.accentBg ?? c.accent,
      danger: c.danger ?? (rest.scheme === "dark" ? "#f87171" : "#dc2626"),
      userBg: c.userBg ?? c.panel,
      userFg: c.userFg ?? c.fg,
      botBg: c.botBg ?? "transparent",
      botFg: c.botFg ?? c.fg,
      botBorder: c.botBorder ?? "transparent",
      sidebar: {
        bg: c.bg,
        panel: c.panel,
        hover: c.hover,
        border: c.border,
        fg: c.fg,
        muted: c.muted,
        ...c.sidebar,
      },
    },
    layout: { ...BASE_LAYOUT, ...layout },
  };
}

export const TEMPLATES: Template[] = [
  define({
    id: DEFAULT_TEMPLATE_ID,
    name: "Classic",
    description: "The original look. Follows your system’s light or dark mode.",
    scheme: "light",
    followSystem: true,
    font: "geist",
    // Light values from globals.css, used for the preview card.
    colors: {
      bg: "#ffffff",
      panel: "#f6f6f7",
      hover: "#ececef",
      border: "#e2e2e6",
      fg: "#18181b",
      muted: "#71717a",
      accent: "#4f46e5",
    },
  }),
  define({
    id: "lavender",
    name: "Lavender",
    description: "Floating card on a soft lavender backdrop, threaded replies and a pill composer.",
    scheme: "light",
    font: "jakarta",
    placeholder: "What’s in your mind?…",
    colors: {
      canvas: "#dfe5f6",
      bg: "#f9f9fd",
      panel: "#ffffff",
      hover: "#f1effe",
      border: "#e9e7f4",
      fg: "#1c1b29",
      muted: "#85849a",
      accent: "#6f58f2",
      userBg: "transparent",
      sidebar: { panel: "#ffffff", bg: "#f6f5fd" },
    },
    layout: { frame: true, sidebar: "floating", messages: "thread", avatars: true, composer: "floating", send: "icon" },
  }),
  define({
    id: "midnight",
    name: "Midnight Sidebar",
    description: "Black grid sidebar, light chat window and bubbles with a colored edge.",
    scheme: "light",
    font: "outfit",
    placeholder: "Type a new message here",
    colors: {
      bg: "#f4f5fa",
      panel: "#ffffff",
      hover: "#eceef5",
      border: "#dcdee8",
      fg: "#1d1d27",
      muted: "#7b7c8a",
      accent: "#1e2a78",
      userBg: "#ffffff",
      botBg: "#ffffff",
      sidebar: { bg: "#16161d", panel: "#0b0b10", hover: "#1d1d26", border: "#262630", fg: "#ececf1", muted: "#8b8b98" },
    },
    layout: { messages: "bars", avatars: true, send: "icon", radius: 6, sidebarPattern: "grid" },
  }),
  define({
    id: "blush",
    name: "Blush Glow",
    description: "Airy pink canvas with a soft glow and suggestion chips to get started.",
    scheme: "light",
    font: "dm-sans",
    welcomeTitle: "Ask our AI anything",
    placeholder: "Ask me anything…",
    colors: {
      canvas: "#fbeaf4",
      bg: "#fefafd",
      panel: "#ffffff",
      hover: "#f7eef8",
      border: "#ecdff0",
      fg: "#1f1630",
      muted: "#7d7290",
      accent: "#9b5cf0",
      userBg: "#f3e8ff",
      sidebar: { panel: "#fdf5fa" },
    },
    layout: { frame: true, composer: "floating", send: "icon", radius: 8, mainPattern: "glow", welcome: "chips" },
  }),
  define({
    id: "indigo",
    name: "Indigo Gradient",
    description: "Vivid blue-violet backdrop, gradient buttons and response cards.",
    scheme: "light",
    font: "inter",
    placeholder: "What’s in your mind?…",
    colors: {
      canvas: "linear-gradient(135deg, #8a7cf6 0%, #5f8cf0 100%)",
      bg: "#f4f6fb",
      panel: "#ffffff",
      hover: "#eef0fb",
      border: "#e3e6f2",
      fg: "#22243a",
      muted: "#8a8ca3",
      accent: "#6366f1",
      accentBg: "linear-gradient(90deg, #7d8ef8, #6a5ae6)",
      userBg: "transparent",
      botBg: "#ffffff",
      botBorder: "#e3e6f2",
    },
    layout: { frame: true, messages: "thread", avatars: true, composer: "floating", send: "icon", radius: 14 },
  }),
  define({
    id: "slate",
    name: "Slate",
    description: "Dark slate workspace with suggestion cards on the start screen.",
    scheme: "dark",
    font: "inter",
    welcomeTitle: "Ai Chat",
    placeholder: "How can I help you?",
    colors: {
      bg: "#2b3038",
      panel: "#363c45",
      hover: "#404750",
      border: "#474e59",
      fg: "#e6e9ee",
      muted: "#9aa3ae",
      accent: "#5aa0f2",
      accentFg: "#0f1720",
      userBg: "#3a414b",
      sidebar: { panel: "#33383f" },
    },
    layout: { composer: "floating", send: "icon", radius: 6, welcome: "cards" },
  }),
  define({
    id: "minimal",
    name: "Minimal",
    description: "Quiet monochrome card with a roomy composer and a tool row.",
    scheme: "light",
    font: "inter",
    welcomeTitle: "Your assistant for work",
    placeholder: "A whole new way to work.",
    colors: {
      canvas: "linear-gradient(180deg, #4a484f 0%, #9a95a3 100%)",
      bg: "#fafafa",
      panel: "#ffffff",
      hover: "#f0f0f0",
      border: "#e9e9e9",
      fg: "#111111",
      muted: "#8c8c8c",
      accent: "#111111",
      userBg: "#f0f0f0",
      sidebar: { panel: "#f4f4f4" },
    },
    layout: { frame: true, composer: "card", send: "icon", radius: 14 },
  }),
  define({
    id: "sky",
    name: "Sky Dashboard",
    description: "Light blue dashboard on a pastel gradient, with outlined replies.",
    scheme: "light",
    font: "dm-sans",
    placeholder: "Write a message…",
    colors: {
      canvas: "linear-gradient(135deg, #f5b8c4 0%, #b7b3f0 100%)",
      bg: "#eef4ff",
      panel: "#ffffff",
      hover: "#e2ecfd",
      border: "#d3e0f7",
      fg: "#1f2a44",
      muted: "#6b7a99",
      accent: "#2f5bd3",
      userBg: "#d3e3fd",
      botBg: "#ffffff",
      botBorder: "#3b6fd8",
      sidebar: { panel: "#ffffff" },
    },
    layout: { frame: true, messages: "bubbles", avatars: true, send: "icon", radius: 10 },
  }),
  define({
    id: "emerald",
    name: "Emerald Night",
    description: "Dark graphite with emerald accents and labelled response cards.",
    scheme: "dark",
    font: "manrope",
    placeholder: "Ask questions, or type ‘/’ for commands",
    colors: {
      bg: "#2c3138",
      panel: "#363c44",
      hover: "#3e454e",
      border: "#454c56",
      fg: "#e8eaed",
      muted: "#9aa1ab",
      accent: "#10b981",
      accentFg: "#04261b",
      userBg: "#3a4048",
      botBg: "#353b43",
      botBorder: "#454c56",
      sidebar: { bg: "#2c3138", panel: "#23272d", hover: "#2f343b", border: "#353a42" },
    },
    layout: { messages: "thread", avatars: true, composer: "floating", send: "icon", radius: 10 },
  }),
  define({
    id: "messenger",
    name: "Messenger",
    description: "Familiar messaging app: light bubbles on both sides with avatars.",
    scheme: "light",
    font: "inter",
    placeholder: "Type your message",
    colors: {
      bg: "#ffffff",
      panel: "#f4f4f5",
      hover: "#eef0f3",
      border: "#e4e6ea",
      fg: "#111827",
      muted: "#8b93a1",
      accent: "#3a8ee6",
      userBg: "#e1efff",
      botBg: "#f1f2f4",
      sidebar: { panel: "#ffffff" },
    },
    layout: { messages: "bubbles", avatars: true, send: "icon", radius: 14 },
  }),
  define({
    id: "mint",
    name: "Mint Contrast",
    description: "Charcoal sidebar next to a bright chat, with green highlights.",
    scheme: "light",
    font: "jakarta",
    placeholder: "Type ‘/’ for commands",
    colors: {
      bg: "#ffffff",
      panel: "#f6f7f8",
      hover: "#eef0f2",
      border: "#e6e8eb",
      fg: "#1b1c1e",
      muted: "#7f8187",
      accent: "#16a34a",
      userBg: "#f1f3f5",
      sidebar: { bg: "#26272a", panel: "#1c1d1f", hover: "#2b2c30", border: "#2e2f33", fg: "#f2f2f2", muted: "#9a9a9a" },
    },
    layout: { avatars: true, send: "icon", radius: 12 },
  }),
  define({
    id: "neon",
    name: "Neon Glass",
    description: "Dark glassy panel with vivid magenta bubbles for your messages.",
    scheme: "dark",
    font: "inter",
    placeholder: "Add a message…",
    colors: {
      canvas: "#111113",
      bg: "#2a2a2d",
      panel: "#333337",
      hover: "#3c3c41",
      border: "#45454b",
      fg: "#f1f1f3",
      muted: "#a0a0a8",
      accent: "#d61ee8",
      userBg: "#d61ee8",
      userFg: "#ffffff",
      botBg: "#38383c",
      sidebar: { panel: "#232326" },
    },
    layout: { frame: true, messages: "bubbles", avatars: true, composer: "floating", send: "icon", radius: 10 },
  }),
  define({
    id: "support",
    name: "Support Desk",
    description: "Clean help-desk inbox: blue bubbles and a bold red Send button.",
    scheme: "light",
    font: "inter",
    placeholder: "Type a message…",
    colors: {
      bg: "#ffffff",
      panel: "#f7f7f8",
      hover: "#efeff2",
      border: "#e8e8ec",
      fg: "#18181b",
      muted: "#71717a",
      accent: "#e5484d",
      userBg: "#3b6fd4",
      userFg: "#ffffff",
      botBg: "#f1f1f3",
      sidebar: { panel: "#fbfbfc" },
    },
    layout: { messages: "bubbles", avatars: true, composer: "card", radius: 8 },
  }),
  define({
    id: "ocean",
    name: "Ocean Bubbles",
    description: "Round, bold bubbles: deep blue for you, charcoal for the assistant.",
    scheme: "light",
    font: "poppins",
    colors: {
      bg: "#ffffff",
      panel: "#f5f5f7",
      hover: "#ececf0",
      border: "#e5e5ea",
      fg: "#1e1e1e",
      muted: "#7c7c86",
      accent: "#2f5fd9",
      userBg: "#2f5fd9",
      userFg: "#ffffff",
      botBg: "#3b3b3b",
      botFg: "#ffffff",
    },
    layout: { messages: "bubbles", send: "icon", radius: 20 },
  }),
  define({
    id: "canvas",
    name: "Canvas",
    description: "Builder-style dotted canvas with crisp white cards and violet accents.",
    scheme: "light",
    font: "dm-sans",
    colors: {
      bg: "#f5f6f8",
      panel: "#ffffff",
      hover: "#eef0f4",
      border: "#e3e5ea",
      fg: "#111827",
      muted: "#6b7280",
      accent: "#5b45e0",
      userBg: "#ede9fe",
      userFg: "#2e1065",
      botBg: "#ffffff",
      botBorder: "#e3e5ea",
      sidebar: { panel: "#ffffff" },
    },
    layout: { messages: "thread", avatars: true, composer: "floating", send: "icon", radius: 10, mainPattern: "dots" },
  }),
  define({
    id: "crimson",
    name: "Crimson Care",
    description: "Warm white assistant with crimson accents and quick-start chips.",
    scheme: "light",
    font: "jakarta",
    welcomeTitle: "Always here to help",
    placeholder: "Type your question…",
    colors: {
      canvas: "#fbeff1",
      bg: "#ffffff",
      panel: "#fff7f8",
      hover: "#fde8eb",
      border: "#f3d3d9",
      fg: "#1f1f23",
      muted: "#7a7a85",
      accent: "#c8102e",
      userBg: "#c8102e",
      userFg: "#ffffff",
      botBg: "#ffffff",
      botBorder: "#f2c9d0",
      sidebar: { panel: "#ffffff" },
    },
    layout: { frame: true, messages: "bubbles", avatars: true, composer: "floating", send: "icon", radius: 14, welcome: "chips" },
  }),
];

export function templateById(id: string | null | undefined): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

/** The template's tokens as CSS custom properties, for <html> or a scoped preview. */
export function templateVars(t: Template): Record<string, string> {
  const c = t.colors;
  return {
    "--canvas": c.canvas,
    "--bg": c.bg,
    "--panel": c.panel,
    "--hover": c.hover,
    "--border": c.border,
    "--fg": c.fg,
    "--muted": c.muted,
    "--accent": c.accent,
    "--accent-fg": c.accentFg,
    "--accent-bg": c.accentBg,
    "--danger": c.danger,
    "--user-bg": c.userBg,
    "--user-fg": c.userFg,
    "--bot-bg": c.botBg,
    "--bot-fg": c.botFg,
    "--bot-border": c.botBorder,
    "--sb-bg": c.sidebar.bg,
    "--sb-panel": c.sidebar.panel,
    "--sb-hover": c.sidebar.hover,
    "--sb-border": c.sidebar.border,
    "--sb-fg": c.sidebar.fg,
    "--sb-muted": c.sidebar.muted,
    "--tpl-radius": `${t.layout.radius}px`,
    "--font-app": `var(${FONT_VARS[t.font]})`,
  };
}

const VAR_NAMES = Object.keys(templateVars(TEMPLATES[0]));

export function applyTemplate(t: Template, el: HTMLElement) {
  for (const name of VAR_NAMES) el.style.removeProperty(name);
  if (!t.followSystem) {
    for (const [name, value] of Object.entries(templateVars(t))) el.style.setProperty(name, value);
  }
  el.style.colorScheme = t.followSystem ? "" : t.scheme;
}

/** Inline <head> script that applies the saved template before first paint, so the page doesn't flash. */
export function templateBootScript(): string {
  const byId = Object.fromEntries(
    TEMPLATES.filter((t) => !t.followSystem).map((t) => [t.id, { v: templateVars(t), s: t.scheme }]),
  );
  return `try{var m=${JSON.stringify(byId)},r=localStorage.getItem(${JSON.stringify(TEMPLATE_STORAGE_KEY)}),t=r&&m[JSON.parse(r)];if(t){var e=document.documentElement;for(var k in t.v)e.style.setProperty(k,t.v[k]);e.style.colorScheme=t.s}}catch(e){}`;
}
