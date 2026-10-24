# OpenAI Chatbot

A chatbot UI built with Next.js (App Router) and TypeScript. It talks to models through [OneProvider](https://app.oneprovider.dev/) and stores chat history in Supabase.

## Features

- **Platform password.** The app is locked until someone enters the password. On first visit, `/unlock` asks you to set it (at least 8 characters). After that, everyone must enter it to reach the chat. It is asked again when the browser is reopened, and after 12 hours. Change it or lock the app under **Settings → Security**.
- Chat with any model OneProvider exposes. The model picker has search and suggestions, and lists recently used models first.
- Add your own OpenAI-compatible providers (OpenAI, OpenRouter, Groq, Ollama, …) under **Settings (⚙, opens the `/settings` page) → API providers** with a name, base URL and API key. Their models appear in the same picker, labelled by provider. The OneProvider key and base URL can be edited there too, which overrides `.env.local`. **Reset** goes back to the server key.
- **Templates.** Under **Settings → Appearance** you can pick one of 16 templates. Each one changes the colors, font, sidebar, message bubbles, composer and start screen. The change applies right away and is remembered in the browser.
- Two response modes:
  - **Stream** shows the reply as it is generated, and you can stop it partway.
  - **Complete** shows the reply only once it has finished.
- Chat history is saved in Supabase. You can search it and rename chats.
- **Attachments.** Attach documents, images, audio or video with 📎, by dropping files on the message box, or by pasting. You can send up to 10 files per message, at most 25 MB each. Files are stored in a private Supabase Storage bucket, shown in the chat (images, audio and video play inline), and sent to the model along with your text.
  - Text and code files are pasted into the message as text, so every model can read them.
  - Which other files a model can read depends on the model:

    | Model | Images | PDFs and documents | Audio | Video |
    | --- | --- | --- | --- | --- |
    | Gemini | ✅ | ✅ | ✅ | ✅ |
    | GPT | ✅ | ✅ | WAV and MP3 | ❌ |
    | Claude | ✅ | ❌ | ❌ | ❌ |

    If the selected model can't read a file, the app tells you before uploading anything.
- Delete several chats at once. Click **Select**, or Ctrl/⌘-click a chat. Shift-click selects a range, and **All** selects every chat.
- **Collections** are folders for chats. You can create, rename, collapse and delete them. Drag chats onto a collection to file them, or drag them onto **Chats** to take them out. If you drag a selected chat, the whole selection moves with it. You can also use **Move to…** in the selection bar.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create the database.** Link your Supabase project, then push the migrations and auth config:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push       # applies supabase/migrations/
   npx supabase config push   # enables anonymous sign-ins from supabase/config.toml
   ```
   Each browser signs in anonymously, and row-level security keeps every user's chats private to them. (Alternatively, paste the migration into the SQL Editor and turn on **Allow anonymous sign-ins** under Authentication → Sign In / Providers.)
3. **Configure the environment**
   ```bash
   cp .env.example .env.local
   ```
   Then fill in `ONEPROVIDER_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `APP_LOCK_SECRET` (any long random string, e.g. `openssl rand -base64 32`).
4. **Run the app**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

## How it works

| Path | Purpose |
| --- | --- |
| `src/app/api/models` | Proxies `GET {base URL}/models` for the provider in `?provider=` |
| `src/middleware.ts` | Redirects every page to `/unlock` (and rejects API calls with 401) until the browser has a valid unlocked cookie |
| `src/app/api/lock` | Unlocks (sets the signed cookie), sets the first password, changes it, and locks again |
| `src/lib/appLock.ts`, `src/lib/lockToken.ts` | The password RPCs (the bcrypt hash never leaves Postgres) and the HMAC-signed cookie token |
| `src/app/api/chat` | Proxies `POST {base URL}/chat/completions` for the chosen provider. When streaming, it passes the SSE stream through unchanged. |
| `src/lib/api.ts` | Browser client for the two routes, including the SSE parser |
| `src/lib/providers.ts` | Server-only: resolves a provider id to its base URL and key (built-in from env, others from Supabase) |
| `src/lib/db.ts` | Supabase queries for collections, chats, messages, providers and attachment uploads |
| `src/lib/attachments.ts` | Shared attachment rules: file kinds, size limits, and which model families can read what |
| `src/lib/templates.ts` | The UI templates: color tokens, font and layout choices, plus the boot script that applies the saved template before first paint |
| `src/lib/useTemplate.ts` | Client store for the active template (`useTemplate()`, `setTemplate()`), saved in localStorage |
| `src/lib/useProviders.ts` | Hook for providers and their models, shared by the chat and the settings page |
| `src/lib/contentParts.ts` | Server-only: downloads a message's attachments as the caller and converts them to the content parts each model family accepts |
| `src/components/` | `ChatApp` (state), `Sidebar` (history, selection, collections, drag-and-drop), `ModelPicker`, `ModeToggle`, `MessageList`, `Composer`, `Attachments`, `SettingsPage` (the `/settings` route), `TemplatePicker` |

The OneProvider key is used only by the two small route handlers inside this Next.js app, so it is never sent to the browser. There is no separate backend.

Keys for providers added in Settings are stored in the `providers` table, protected by row-level security. The browser never reads them back. The route handlers look them up with the caller's own Supabase session.
