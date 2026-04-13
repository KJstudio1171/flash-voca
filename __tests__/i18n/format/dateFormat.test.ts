import { formatDate } from "@/src/shared/i18n/format/dateFormat";

describe("formatDate", () => {
  const iso = "2026-04-13T09:30:00Z";

  it("formats ko locale (medium)", () => {
    const output = formatDate(iso, "ko", "medium");
    expect(output).toMatch(/2026/);
  });

  it("formats en locale (short)", () => {
    const output = formatDate(iso, "en", "short");
    expect(output).toMatch(/26|2026/);
  });

  it("accepts Date objects", () => {
    const output = formatDate(new Date(iso), "ja", "medium");
    expect(output).toMatch(/2026/);
  });

  it("defaults to medium style when not provided", () => {
    const output = formatDate(iso, "zh");
    expect(output).toMatch(/2026/);
  });
});
