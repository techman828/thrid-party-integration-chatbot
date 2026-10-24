import { resolveProvider, upstreamError } from "@/lib/providers";
import { BUILTIN_PROVIDER_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/models?provider=<id> — the model ids that provider's `/models` endpoint lists. */
export async function GET(req: Request) {
  const providerId = new URL(req.url).searchParams.get("provider") ?? BUILTIN_PROVIDER_ID;

  try {
    const provider = await resolveProvider(req, providerId);
    // A built-in provider with no key is simply absent, not an error.
    if (!provider) return Response.json({ models: [], configured: false });
    const { baseUrl, headers } = provider;
    const res = await fetch(`${baseUrl}/models`, { headers, cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: await upstreamError(res) }, { status: res.status });
    }
    const json = await res.json();
    const raw: Array<{ id: string; owned_by?: string }> = Array.isArray(json?.data) ? json.data : [];
    const models = raw
      .filter((m) => typeof m?.id === "string")
      .map((m) => ({ id: m.id, owned_by: m.owned_by }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return Response.json({ models, configured: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
