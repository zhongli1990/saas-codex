export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8080";

export async function GET(_req: Request, ctx: { params: { runId: string } }) {
  const upstream = await fetch(`${BACKEND_URL}/api/runs/${ctx.params.runId}/events`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream"
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
