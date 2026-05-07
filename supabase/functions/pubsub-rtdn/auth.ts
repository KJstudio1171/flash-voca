export async function verifyPubSubOIDC(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length);
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return false;
    const info = (await res.json()) as { aud?: string; email?: string };
    return Boolean(info.email);
  } catch {
    return false;
  }
}
