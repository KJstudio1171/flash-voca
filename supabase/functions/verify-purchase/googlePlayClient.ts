// Deno-compatible Google service-account auth using djwt
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pkcs8 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(pkcs8), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessTokenAsync(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const json = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  const sa = JSON.parse(json) as ServiceAccountKey;
  const key = await importPrivateKey(sa.private_key);

  const jwt = await createJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: sa.token_uri,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60),
    },
    key,
  );

  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`OAuth token failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const data = (await tokenRes.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in,
  };
  return data.access_token;
}

export async function getProductPurchaseAsync(
  packageName: string,
  productId: string,
  purchaseToken: string,
): Promise<{ purchaseState: number; raw: unknown }> {
  const token = await getAccessTokenAsync();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Play API ${res.status}: ${await res.text()}`);
  }
  const raw = await res.json();
  return { purchaseState: (raw as { purchaseState: number }).purchaseState ?? -1, raw };
}

export async function getSubscriptionPurchaseAsync(
  packageName: string,
  purchaseToken: string,
): Promise<{
  subscriptionState: string;
  lineItems?: { expiryTime?: string }[];
  raw: unknown;
}> {
  const token = await getAccessTokenAsync();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Play subscriptions API ${res.status}: ${await res.text()}`);
  }
  const raw = (await res.json()) as {
    subscriptionState: string;
    lineItems?: { expiryTime?: string }[];
  };
  return {
    subscriptionState: raw.subscriptionState,
    lineItems: raw.lineItems,
    raw,
  };
}
