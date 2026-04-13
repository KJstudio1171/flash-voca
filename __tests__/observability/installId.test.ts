import { getOrCreateInstallId } from "@/src/core/observability/installId";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";

describe("getOrCreateInstallId", () => {
  it("creates and persists a UUID on first call", async () => {
    const store = new InMemoryKeyValueStore();
    const id = await getOrCreateInstallId(store);
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await store.get("install_id")).toBe(id);
  });

  it("returns the same id on subsequent calls", async () => {
    const store = new InMemoryKeyValueStore();
    const first = await getOrCreateInstallId(store);
    const second = await getOrCreateInstallId(store);
    expect(second).toBe(first);
  });

  it("returns pre-existing id when store already has one", async () => {
    const store = new InMemoryKeyValueStore();
    await store.set("install_id", "preset-uuid");
    expect(await getOrCreateInstallId(store)).toBe("preset-uuid");
  });
});
