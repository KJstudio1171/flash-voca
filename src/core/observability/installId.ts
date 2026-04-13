import type { KeyValueStore } from "@/src/core/observability/storage";

const KEY = "install_id";

export async function getOrCreateInstallId(
  store: KeyValueStore,
  generateId: () => string,
): Promise<string> {
  const existing = await store.get(KEY);
  if (existing) return existing;
  const id = generateId();
  await store.set(KEY, id);
  return id;
}
