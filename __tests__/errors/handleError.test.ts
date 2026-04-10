import { DeckSaveError, UnknownError } from "@/src/core/errors";
import { normalizeError, createErrorHandler } from "@/src/core/errors/handleError";

describe("normalizeError", () => {
  it("returns AppError as-is", () => {
    const error = new DeckSaveError({ context: { deckId: "d1" } });
    const result = normalizeError(error);
    expect(result).toBe(error);
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
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "oops" });
  });

  it("wraps undefined in UnknownError with rawValue", () => {
    const result = normalizeError(undefined);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "undefined" });
  });

  it("wraps null in UnknownError with rawValue", () => {
    const result = normalizeError(null);
    expect(result).toBeInstanceOf(UnknownError);
    expect(result.context).toEqual({ rawValue: "null" });
  });
});

describe("createErrorHandler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls logger.error and toast.show for AppError", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });
    const error = new DeckSaveError();

    handleError(error);

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("덱 저장에 실패했습니다.");
  });

  it("normalizes plain Error before handling", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });

    handleError(new Error("raw error"));

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("알 수 없는 오류가 발생했습니다.");
  });

  it("normalizes non-Error values before handling", () => {
    const mockShow = jest.fn();
    const handleError = createErrorHandler({ show: mockShow });

    handleError("string error");

    expect(mockShow).toHaveBeenCalledWith("알 수 없는 오류가 발생했습니다.");
  });
});
