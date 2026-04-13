import { Analytics } from "@/src/core/observability/analytics";
import { BreadcrumbBuffer } from "@/src/core/observability/breadcrumbBuffer";
import { ConsentStore } from "@/src/core/observability/consent";
import {
  FakeAnalyticsSink,
  ThrowingAnalyticsSink,
} from "@/__tests__/observability/helpers/FakeErrorSink";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";
import { makeEnricher } from "@/__tests__/observability/helpers/observabilityFactories";

function setDev(value: boolean): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

function makeConsent(): ConsentStore {
  return new ConsentStore(new InMemoryKeyValueStore());
}

describe("Analytics (production gate)", () => {
  beforeEach(() => {
    setDev(false);
  });

  afterEach(() => {
    setDev(true);
  });

  it("records breadcrumb even when consent is false", async () => {
    const buffer = new BreadcrumbBuffer();
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), buffer, makeConsent());

    await analytics.track("deck_created", { cardCount: 5, isCustom: true });

    expect(buffer.snapshot()).toHaveLength(1);
    expect(buffer.snapshot()[0].name).toBe("deck_created");
    expect(sink.received).toHaveLength(0);
  });

  it("calls sink when analytics consent is true", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), new BreadcrumbBuffer(), consent);

    await analytics.track("deck_created", { cardCount: 5, isCustom: true });

    expect(sink.received).toHaveLength(1);
    expect(sink.received[0].properties).toEqual({ cardCount: 5, isCustom: true });
  });

  it("scrubs disallowed props at runtime", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(sink, makeEnricher(), new BreadcrumbBuffer(), consent);

    await analytics.track("deck_created", {
      cardCount: 5,
      // @ts-expect-error - deckName is not in registry
      deckName: "secret",
    });

    expect(sink.received[0].properties).toEqual({ cardCount: 5 });
  });

  it("suppresses sink exceptions", async () => {
    const consent = makeConsent();
    await consent.setAnalytics(true);
    const analytics = new Analytics(
      new ThrowingAnalyticsSink(),
      makeEnricher(),
      new BreadcrumbBuffer(),
      consent,
    );

    await expect(analytics.track("app_opened")).resolves.toBeUndefined();
  });
});

describe("Analytics (__DEV__ bypass)", () => {
  beforeEach(() => {
    setDev(true);
  });

  it("calls sink even when consent is false", async () => {
    const sink = new FakeAnalyticsSink();
    const analytics = new Analytics(
      sink,
      makeEnricher(),
      new BreadcrumbBuffer(),
      makeConsent(),
    );
    await analytics.track("app_opened");
    expect(sink.received).toHaveLength(1);
  });
});
