import { getOrCreateInstallId } from "@/src/core/observability/installId";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";

describe("getOrCreateInstallId", () => {
  it("creates and persists a generated id on first call", async () => {
    const store = new InMemoryKeyValueStore();
    const id = await getOrCreateInstallId(store, () => "generated-uuid");
    expect(id).toBe("generated-uuid");
    expect(await store.get("install_id")).toBe("generated-uuid");
  });

  it("returns the same id on subsequent calls without re-generating", async () => {
    const store = new InMemoryKeyValueStore();
    let calls = 0;
    const gen = () => {
      calls += 1;
      return `uuid-${calls}`;
    };
    const first = await getOrCreateInstallId(store, gen);
    const second = await getOrCreateInstallId(store, gen);
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it("returns pre-existing id when store already has one", async () => {
    const store = new InMemoryKeyValueStore();
    await store.set("install_id", "preset-uuid");
    const gen = jest.fn(() => "should-not-be-used");
    expect(await getOrCreateInstallId(store, gen)).toBe("preset-uuid");
    expect(gen).not.toHaveBeenCalled();
  });
});
