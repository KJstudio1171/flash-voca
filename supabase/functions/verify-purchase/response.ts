export function jsonError(status: number, code: string) {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonSuccess(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
