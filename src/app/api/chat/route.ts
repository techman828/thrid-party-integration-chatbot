import { resolveProvider, upstreamError, userClient, type ResolvedProvider } from "@/lib/providers";
import { toUpstreamMessages, type UpstreamMessage } from "@/lib/contentParts";
import { BUILTIN_PROVIDER_ID, type ChatTurn } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ChatRequest {
  provider?: string;
  model?: string;
  messages?: ChatTurn[];
  stream?: boolean;
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { provider: providerId = BUILTIN_PROVIDER_ID, model, messages, stream = false } = body;
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "`model` and a non-empty `messages` array are required." }, { status: 400 });
  }

  let provider: ResolvedProvider | null;
  try {
    provider = await resolveProvider(req, providerId);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
  if (!provider) {
    return Response.json({ error: "OneProvider has no API key. Add one in Settings." }, { status: 400 });
  }

  let upstreamMessages: UpstreamMessage[];
  try {
    upstreamMessages = await toUpstreamMessages(messages, model, userClient(req));
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: provider.headers,
      body: JSON.stringify({
        model,
        messages: upstreamMessages,
        stream,
      }),
      // Cancels the upstream generation when the browser aborts (Stop button).
      signal: req.signal,
      cache: "no-store",
    });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json({ error: await upstreamError(upstream) }, { status: upstream.status });
  }

  if (stream) {
    // Pass the SSE stream straight through; the client parses `data:` lines.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const json = await upstream.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  return Response.json({ content, usage: json?.usage ?? null });
}
