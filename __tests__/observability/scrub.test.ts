import {
  scrubErrorContext,
  scrubAnalyticsProperties,
} from "@/src/core/observability/scrub";

describe("scrubErrorContext", () => {
  it("keeps allowed keys", () => {
    const result = scrubErrorContext({ deckId: "d1", httpStatus: 500 });
    expect(result).toEqual({ deckId: "d1", httpStatus: 500 });
  });

  it("drops disallowed keys (e.g. deckName)", () => {
    const result = scrubErrorContext({ deckId: "d1", deckName: "secret" });
    expect(result).toEqual({ deckId: "d1" });
  });

  it("truncates long strings to 200 chars", () => {
    const long = "a".repeat(500);
    const result = scrubErrorContext({ deckId: long });
    expect((result?.deckId as string).length).toBe(200);
  });

  it("replaces nested objects with [redacted]", () => {
    const result = scrubErrorContext({ deckId: { nested: true } });
    expect(result).toEqual({ deckId: "[redacted]" });
  });

  it("returns undefined for empty input", () => {
    expect(scrubErrorContext(undefined)).toBeUndefined();
    expect(scrubErrorContext({})).toBeUndefined();
    expect(scrubErrorContext({ deckName: "x" })).toBeUndefined();
  });
});

describe("scrubAnalyticsProperties", () => {
  it("keeps allowed props for registered event", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: 10,
      isCustom: true,
    });
    expect(result).toEqual({ cardCount: 10, isCustom: true });
  });

  it("drops unregistered props", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: 10,
      deckName: "secret",
    });
    expect(result).toEqual({ cardCount: 10 });
  });

  it("returns undefined when nothing survives", () => {
    expect(
      scrubAnalyticsProperties("deck_created", { deckName: "secret" }),
    ).toBeUndefined();
  });

  it("coerces nested objects to [redacted]", () => {
    const result = scrubAnalyticsProperties("deck_created", {
      cardCount: { nested: 1 } as unknown as number,
    });
    expect(result).toEqual({ cardCount: "[redacted]" });
  });
});
