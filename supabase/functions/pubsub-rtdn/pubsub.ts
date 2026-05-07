import type { RtdnPayload } from "./types.ts";

export async function parsePubSubPayload(
  req: Request,
): Promise<RtdnPayload | Response> {
  let pubsubMessage: { message?: { data?: string } };
  try {
    pubsubMessage = await req.json();
  } catch {
    return new Response("invalid_request", { status: 400 });
  }

  const data = pubsubMessage.message?.data;
  if (!data) return new Response("", { status: 204 });

  try {
    return JSON.parse(atob(data)) as RtdnPayload;
  } catch {
    return new Response("invalid_payload", { status: 400 });
  }
}
