import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createLockToken, LOCK_COOKIE } from "./lockToken";

/** Calls the platform-password RPCs. They need no user session; the hash stays inside Postgres. */
function rpcClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpcClient().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const isPasswordSet = () => rpc<boolean>("app_password_is_set");

export const verifyPassword = (password: string) => rpc<boolean>("verify_app_password", { password });

/** Returns false when currentPassword is wrong. Pass null for the very first password. */
export const setPassword = (currentPassword: string | null, newPassword: string) =>
  rpc<boolean>("set_app_password", { current_password: currentPassword, new_password: newPassword });

/**
 * The unlocked-session cookie. It has no maxAge, so closing the browser locks the app again;
 * the token inside also expires after LOCK_TTL_MS.
 */
export async function unlockedCookie() {
  return {
    name: LOCK_COOKIE,
    value: await createLockToken(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
