import { ConsentStore } from "@/src/core/observability/consent";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";

describe("ConsentStore", () => {
  it("defaults both channels to false", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    expect(await store.load()).toEqual({ errorReports: false, analytics: false });
  });

  it("setErrorReports persists and load reflects", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    await store.setErrorReports(true);
    expect(await store.load()).toEqual({ errorReports: true, analytics: false });
  });

  it("channels are independent", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    await store.setAnalytics(true);
    expect(await store.load()).toEqual({ errorReports: false, analytics: true });
  });

  it("hasDecided is false until markDecided is called", async () => {
    const store = new ConsentStore(new InMemoryKeyValueStore());
    expect(await store.hasDecided()).toBe(false);
    await store.markDecided();
    expect(await store.hasDecided()).toBe(true);
  });
});
