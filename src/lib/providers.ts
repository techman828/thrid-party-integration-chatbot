import "server-only";
import { createClient } from "@supabase/supabase-js";
import { BUILTIN_DEFAULT_BASE_URL, BUILTIN_PROVIDER_ID } from "./types";

export interface ResolvedProvider {
  baseUrl: string;
  headers: Record<string, string>;
}

function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function headersFor(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

/** A Supabase client acting as the caller (their session from the Authorization header), or null if signed out. */
export function userClient(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = req.headers.get("authorization");
  if (!url || !anonKey || !auth) return null;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Looks up the provider for this request, or null when the built-in provider has no key anywhere.
 * Rows are read with the caller's own Supabase session, so RLS guarantees they only use their own keys.
 */
export async function resolveProvider(req: Request, providerId: string): Promise<ResolvedProvider | null> {
  const supabase = userClient(req);

  if (providerId === BUILTIN_PROVIDER_ID) {
    // A key saved in Settings overrides the server env; either half falls back to the env value.
    let override: { base_url: string; api_key: string } | null = null;
    if (supabase) {
      const { data, error } = await supabase
        .from("providers")
        .select("base_url, api_key")
        .eq("builtin_id", BUILTIN_PROVIDER_ID)
        .maybeSingle();
      if (error) throw new Error(error.message);
      override = data;
    }
    const key = override?.api_key || process.env.ONEPROVIDER_API_KEY;
    if (!key) return null;
    const baseUrl = override?.base_url || process.env.ONEPROVIDER_BASE_URL || BUILTIN_DEFAULT_BASE_URL;
    return { baseUrl: trimUrl(baseUrl), headers: headersFor(key) };
  }

  if (!supabase) throw new Error("Missing session; reload the page and try again.");
  const { data, error } = await supabase
    .from("providers")
    .select("base_url, api_key")
    .eq("id", providerId)
    .is("builtin_id", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Provider not found. It may have been deleted in Settings.");
  return { baseUrl: trimUrl(data.base_url), headers: headersFor(data.api_key) };
}

/** Pulls a readable message out of an upstream error body (OpenAI/Anthropic style or plain text). */
export async function upstreamError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json?.error?.message ?? json?.message ?? text;
  } catch {
    return text || `Upstream request failed with status ${res.status}`;
  }
}
