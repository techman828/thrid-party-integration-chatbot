import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isPasswordSet, setPassword, unlockedCookie, verifyPassword } from "@/lib/appLock";
import { LOCK_COOKIE, verifyLockToken } from "@/lib/lockToken";

// Not covered by the middleware: these handlers are how a browser gets (or drops) the unlocked cookie.

const MIN_LENGTH = 8;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Slows down password guessing a little. */
const pause = () => new Promise((r) => setTimeout(r, 600));

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/** Unlock with { password }, or set the first password with { password, create: true }. */
export async function POST(req: Request) {
  const { password, create } = await body(req);
  if (typeof password !== "string" || !password) return fail("Enter the password.", 400);

  try {
    if (create) {
      if (password.length < MIN_LENGTH) return fail(`The password must be at least ${MIN_LENGTH} characters.`, 400);
      if (!(await setPassword(null, password))) return fail("A password has already been set. Reload the page to enter it.", 409);
    } else if (!(await verifyPassword(password))) {
      await pause();
      return fail(
        (await isPasswordSet()) ? "Wrong password." : "No password has been set yet. Reload the page to create one.",
        401,
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(await unlockedCookie());
    return res;
  } catch (err) {
    return fail((err as Error).message, 500);
  }
}

/** Change the password with { current, next }. Requires an unlocked session. */
export async function PUT(req: Request) {
  if (!(await verifyLockToken((await cookies()).get(LOCK_COOKIE)?.value))) return fail("Locked. Enter the password first.", 401);
  const { current, next } = await body(req);
  if (typeof current !== "string" || typeof next !== "string") return fail("Enter the current and the new password.", 400);
  if (next.length < MIN_LENGTH) return fail(`The new password must be at least ${MIN_LENGTH} characters.`, 400);

  try {
    if (!(await setPassword(current, next))) {
      await pause();
      return fail("The current password is wrong.", 403);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(await unlockedCookie());
    return res;
  } catch (err) {
    return fail((err as Error).message, 500);
  }
}

/** Lock this browser again. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(LOCK_COOKIE);
  return res;
}
