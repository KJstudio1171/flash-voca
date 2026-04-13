import { ContextEnricher } from "@/src/core/observability/contextEnricher";

describe("ContextEnricher", () => {
  it("build() returns composed context with getLocale evaluated lazily", () => {
    let locale = "ko";
    const enricher = new ContextEnricher(
      "install-123",
      "1.0.0",
      "android",
      "14",
      () => locale,
      "session-abc",
    );

    const ctx1 = enricher.build();
    expect(ctx1).toEqual({
      installId: "install-123",
      appVersion: "1.0.0",
      platform: "android",
      osVersion: "14",
      locale: "ko",
      sessionId: "session-abc",
      userId: undefined,
    });

    locale = "en";
    const ctx2 = enricher.build();
    expect(ctx2.locale).toBe("en");
  });

  it("build(userId) attaches userId", () => {
    const enricher = new ContextEnricher(
      "i",
      "v",
      "ios",
      "17",
      () => "ja",
      "s",
    );
    expect(enricher.build("user-1").userId).toBe("user-1");
  });
});
