import { DeckSaveError } from "@/src/core/errors";
import { ErrorReporter } from "@/src/core/observability/errorReporter";
import { ConsentStore } from "@/src/core/observability/consent";
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";
import {
  FakeErrorSink,
  ThrowingErrorSink,
} from "@/__tests__/observability/helpers/FakeErrorSink";
import { InMemoryKeyValueStore } from "@/__tests__/observability/helpers/InMemoryKeyValueStore";
import {
  makeBreadcrumbBuffer,
  makeEnricher,
} from "@/__tests__/observability/helpers/observabilityFactories";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

function setDev(value: boolean): void {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

function makeConsent(): ConsentStore {
  return new ConsentStore(new InMemoryKeyValueStore());
}

describe("ErrorReporter (production gate)", () => {
  beforeEach(() => {
    setDev(false);
  });

  afterEach(() => {
    setDev(true);
  });

  it("does not call sink when consent is false", async () => {
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(
      sink,
      makeEnricher(),
      makeBreadcrumbBuffer(),
      makeConsent(),
    );
    await reporter.report(new DeckSaveError({ context: { deckId: "d1" } }));
    expect(sink.received).toHaveLength(0);
  });

  it("calls sink when errorReports consent is true", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    await reporter.report(new DeckSaveError({ context: { deckId: "d1" } }));
    expect(sink.received).toHaveLength(1);
    expect(sink.received[0].context).toEqual({ deckId: "d1" });
  });

  it("scrubs disallowed context keys", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    await reporter.report(
      new DeckSaveError({ context: { deckId: "d1", deckName: "secret" } }),
    );
    expect(sink.received[0].context).toEqual({ deckId: "d1" });
  });

  it("attaches breadcrumb snapshot", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const buffer = makeBreadcrumbBuffer();
    buffer.push({
      timestamp: new Date().toISOString(),
      kind: "event",
      name: "deck_created",
    });
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), buffer, consent);

    await reporter.report(new DeckSaveError());
    expect(sink.received[0].breadcrumbs).toHaveLength(1);
    expect(sink.received[0].breadcrumbs[0].name).toBe("deck_created");
  });

  it("suppresses sink exceptions", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const reporter = new ErrorReporter(
      new ThrowingErrorSink(),
      makeEnricher(),
      makeBreadcrumbBuffer(),
      consent,
    );

    await expect(reporter.report(new DeckSaveError())).resolves.toBeUndefined();
  });

  it("serializes cause to { name, message }", async () => {
    const consent = makeConsent();
    await consent.setErrorReports(true);
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(sink, makeEnricher(), makeBreadcrumbBuffer(), consent);

    const cause = new Error("underlying");
    await reporter.report(new DeckSaveError({ cause }));
    expect(sink.received[0].cause).toEqual({ name: "Error", message: "underlying" });
  });
});

describe("ErrorReporter (__DEV__ bypass)", () => {
  beforeEach(() => {
    setDev(true);
  });

  it("calls sink even when consent is false", async () => {
    const sink = new FakeErrorSink();
    const reporter = new ErrorReporter(
      sink,
      makeEnricher(),
      makeBreadcrumbBuffer(),
      makeConsent(),
    );
    await reporter.report(new DeckSaveError());
    expect(sink.received).toHaveLength(1);
  });
});
