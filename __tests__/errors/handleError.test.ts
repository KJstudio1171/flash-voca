import { DeckSaveError, UnknownError } from "@/src/core/errors";
import { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";
import { setupI18nForTest } from "@/__tests__/helpers/i18nTestSetup";
import type { AppError } from "@/src/core/errors";

beforeAll(async () => {
  await setupI18nForTest("ko");
});

describe("normalizeError", () => {
  it("returns AppError as-is", () => {
    const error = new DeckSaveError({ context: { deckId: "d1" } });
    expect(normalizeError(error)).toBe(error);
  });

  it("wraps plain Error in UnknownError with originalMessage", () => {
    const error = new Error("something broke");
    const result = normalizeError(error);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ originalMessage: "something broke" });
    expect(result.cause).toBe(error);
  });

  it("wraps string in UnknownError with rawValue", () => {
    const result = normalizeError("oops");
    expect(result.context).toEqual({ rawValue: "oops" });
  });

  it("wraps undefined in UnknownError with rawValue", () => {
    const result = normalizeError(undefined);
    expect(result.context).toEqual({ rawValue: "undefined" });
  });

  it("wraps null in UnknownError with rawValue", () => {
    const result = normalizeError(null);
    expect(result.context).toEqual({ rawValue: "null" });
  });
});

describe("createErrorHandler", () => {
  function setup() {
    const received: AppError[] = [];
    const reporter = {
      report: async (err: AppError) => { received.push(err); },
    };
    const toastShown: string[] = [];
    const toast = { show: (m: string) => { toastShown.push(m); } };
    const handleError = createErrorHandler(toast, reporter);
    return { received, toastShown, handleError };
  }

  it("reports AppError and shows localized toast", async () => {
    const { received, toastShown, handleError } = setup();
    handleError(new DeckSaveError());
    await new Promise((r) => setImmediate(r));
    expect(received).toHaveLength(1);
    expect(received[0]).toBeInstanceOf(DeckSaveError);
    expect(toastShown).toEqual(["덱 저장에 실패했습니다."]);
  });

  it("normalizes plain Error before handling", async () => {
    const { received, toastShown, handleError } = setup();
    handleError(new Error("raw error"));
    await new Promise((r) => setImmediate(r));
    expect(received[0]).toBeInstanceOf(UnknownError);
    expect(toastShown).toEqual(["알 수 없는 오류가 발생했습니다."]);
  });

  it("normalizes non-Error values before handling", async () => {
    const { toastShown, handleError } = setup();
    handleError("string error");
    await new Promise((r) => setImmediate(r));
    expect(toastShown).toEqual(["알 수 없는 오류가 발생했습니다."]);
  });
});
