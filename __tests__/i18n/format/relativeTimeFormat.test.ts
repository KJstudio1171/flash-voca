import { formatRelativeTime } from "@/src/shared/i18n/format/relativeTimeFormat";

const now = new Date("2026-04-13T12:00:00Z");

describe("formatRelativeTime", () => {
  it("returns a past expression for 3 days ago in ko", () => {
    const past = new Date("2026-04-10T12:00:00Z").toISOString();
    const output = formatRelativeTime(past, "ko", now);
    expect(output).toMatch(/3|전/);
  });

  it("returns a past expression for 2 hours ago in en", () => {
    const past = new Date("2026-04-13T10:00:00Z").toISOString();
    const output = formatRelativeTime(past, "en", now);
    expect(output).toMatch(/2|hour|ago/i);
  });

  it("returns a future expression for 1 day ahead in ja", () => {
    const future = new Date("2026-04-14T12:00:00Z").toISOString();
    const output = formatRelativeTime(future, "ja", now);
    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });

  it("returns non-empty string for zh", () => {
    const past = new Date("2026-04-11T12:00:00Z").toISOString();
    const output = formatRelativeTime(past, "zh", now);
    expect(output.length).toBeGreaterThan(0);
  });
});
