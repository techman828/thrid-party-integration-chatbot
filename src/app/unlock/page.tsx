import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UnlockPage from "@/components/UnlockPage";
import { isPasswordSet } from "@/lib/appLock";
import { LOCK_COOKIE, safeNextPath, verifyLockToken } from "@/lib/lockToken";

export const metadata: Metadata = { title: "Unlock · OpenAI Chatbot" };
export const dynamic = "force-dynamic";

export default async function Unlock({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  if (await verifyLockToken((await cookies()).get(LOCK_COOKIE)?.value)) redirect(next);

  let passwordSet = false;
  let error: string | null = null;
  try {
    passwordSet = await isPasswordSet();
  } catch (err) {
    error = `Couldn’t check the platform password: ${(err as Error).message}. Make sure the Supabase migrations are applied (npx supabase db push).`;
  }
  return <UnlockPage mode={passwordSet ? "enter" : "create"} next={next} setupError={error} />;
}
