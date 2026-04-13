import { LocaleService } from "@/src/shared/i18n/LocaleService";
import type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";
import type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";

function createMockStorage(initial: string | null = null): LocaleStorage & { stored: string | null } {
  const state = { stored: initial };
  return {
    get stored() {
      return state.stored;
    },
    set stored(v) {
      state.stored = v;
    },
    async getStoredLocale() {
      return state.stored;
    },
    async setStoredLocale(locale) {
      state.stored = locale;
    },
  };
}

function createMockDetector(deviceLocale: string | null): LocaleDetector {
  return { detectDeviceLocale: () => deviceLocale };
}

describe("LocaleService.resolveInitialLocale", () => {
  it("returns stored locale when present and supported", async () => {
    const service = new LocaleService(createMockStorage("ja"), createMockDetector("en"));
    expect(await service.resolveInitialLocale()).toBe("ja");
  });

  it("falls back to device locale when no stored value", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("zh"));
    expect(await service.resolveInitialLocale()).toBe("zh");
  });

  it("falls back to default when device locale is unsupported", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("fr"));
    expect(await service.resolveInitialLocale()).toBe("en");
  });

  it("falls back to default when device locale is null", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector(null));
    expect(await service.resolveInitialLocale()).toBe("en");
  });

  it("ignores stored locale when unsupported and falls through to device", async () => {
    const service = new LocaleService(createMockStorage("fr"), createMockDetector("ko"));
    expect(await service.resolveInitialLocale()).toBe("ko");
  });
});

describe("LocaleService.setLocale", () => {
  it("persists supported locale and notifies subscribers", async () => {
    const storage = createMockStorage(null);
    const service = new LocaleService(storage, createMockDetector("en"));
    const received: string[] = [];
    service.subscribe((l) => received.push(l));

    await service.setLocale("ja");

    expect(storage.stored).toBe("ja");
    expect(received).toEqual(["ja"]);
  });

  it("rejects unsupported locale", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("en"));
    await expect(service.setLocale("fr")).rejects.toThrow(/unsupported locale/i);
  });

  it("unsubscribe stops further notifications", async () => {
    const service = new LocaleService(createMockStorage(null), createMockDetector("en"));
    const received: string[] = [];
    const unsubscribe = service.subscribe((l) => received.push(l));

    await service.setLocale("ja");
    unsubscribe();
    await service.setLocale("zh");

    expect(received).toEqual(["ja"]);
  });
});
