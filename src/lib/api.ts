import { authHeaders } from "./supabase";
import { parseModelRef, type ChatTurn, type ResponseMode } from "./types";

async function errorMessage(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return json?.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export interface ProviderModels {
  models: Array<{ id: string; owned_by?: string }>;
  /** False when the built-in provider has no API key on the server. */
  configured: boolean;
}

export async function fetchModels(providerId: string): Promise<ProviderModels> {
  const res = await fetch(`/api/models?provider=${encodeURIComponent(providerId)}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  const json = await res.json();
  return { models: json.models ?? [], configured: json.configured !== false };
}

interface SendChatOptions {
  /** A model ref ("<providerId>::<modelId>"). */
  model: string;
  messages: ChatTurn[];
  mode: ResponseMode;
  signal?: AbortSignal;
  /** Called with the full text so far each time a streamed chunk arrives. */
  onDelta?: (text: string) => void;
}

/**
 * Sends the conversation to the model and resolves with the complete reply.
 * If aborted mid-stream, rejects with an AbortError whose `partial` holds the text received so far.
 */
export async function sendChat({ model, messages, mode, signal, onDelta }: SendChatOptions): Promise<string> {
  const { providerId, modelId } = parseModelRef(model);
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ provider: providerId, model: modelId, messages, stream: mode === "stream" }),
    signal,
  });
  if (!res.ok) throw new Error(await errorMessage(res));

  if (mode === "complete") {
    const json = await res.json();
    return json.content ?? "";
  }

  if (!res.body) throw new Error("The response has no body to stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (data === "[DONE]") return text;

        let event: {
          error?: { message?: string };
          choices?: Array<{ delta?: { content?: string } }>;
        };
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        if (event.error) throw new Error(event.error.message ?? "The model returned an error.");

        const delta = event.choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          onDelta?.(text);
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") Object.assign(err as Error, { partial: text });
    throw err;
  }
  return text;
}
