// The signed "unlocked" cookie. Uses only Web Crypto so both the middleware and route handlers can import it.

export const LOCK_COOKIE = "app_unlocked";
/** Even an open browser has to re-enter the password after this long. */
export const LOCK_TTL_MS = 12 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function secretKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  const secret = process.env.APP_LOCK_SECRET;
  if (!secret) throw new Error("APP_LOCK_SECRET is not set. Add a long random string to .env.local.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

function toBase64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** A token of the form "<expiry ms>.<HMAC of expiry>". */
export async function createLockToken(): Promise<string> {
  const exp = String(Date.now() + LOCK_TTL_MS);
  const sig = await crypto.subtle.sign("HMAC", await secretKey("sign"), encoder.encode(exp));
  return `${exp}.${toBase64Url(sig)}`;
}

export async function verifyLockToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  try {
    return await crypto.subtle.verify("HMAC", await secretKey("verify"), fromBase64Url(sig), encoder.encode(exp));
  } catch {
    return false;
  }
}

/** Only same-site paths are allowed as the post-unlock destination. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
