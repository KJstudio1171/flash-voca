import { formatNumber } from "@/src/shared/i18n/format/numberFormat";

describe("formatNumber", () => {
  it("formats with ko thousands separator", () => {
    expect(formatNumber(1234567, "ko")).toBe("1,234,567");
  });
  it("formats with en thousands separator", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });
  it("formats with ja thousands separator", () => {
    expect(formatNumber(1234567, "ja")).toBe("1,234,567");
  });
  it("formats with zh thousands separator", () => {
    expect(formatNumber(1234567, "zh")).toBe("1,234,567");
  });
  it("handles decimal numbers", () => {
    expect(formatNumber(3.14, "en")).toBe("3.14");
  });
});
