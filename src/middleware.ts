import { NextResponse, type NextRequest } from "next/server";
import { LOCK_COOKIE, verifyLockToken } from "@/lib/lockToken";

/** Every page and API route needs the platform password first; see /unlock and /api/lock. */
export async function middleware(req: NextRequest) {
  if (await verifyLockToken(req.cookies.get(LOCK_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked. Reload the page and enter the password." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = pathname === "/" && !search ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!unlock|api/lock|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};
