import { randomUUID } from "crypto";

import type { KeyValueStore } from "@/src/core/observability/storage";

const KEY = "install_id";

export async function getOrCreateInstallId(store: KeyValueStore): Promise<string> {
  const existing = await store.get(KEY);
  if (existing) return existing;
  const id = randomUUID();
  await store.set(KEY, id);
  return id;
}
