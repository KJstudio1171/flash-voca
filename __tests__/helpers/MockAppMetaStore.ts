import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";

export function createMockAppMetaStore(
  initial: Record<string, string> = {},
): AppMetaStore {
  const store = new Map(Object.entries(initial));
  return {
    getValueAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setValueAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
  };
}
