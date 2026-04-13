import ko from "@/src/shared/i18n/locales/ko.json";
import en from "@/src/shared/i18n/locales/en.json";
import ja from "@/src/shared/i18n/locales/ja.json";
import zh from "@/src/shared/i18n/locales/zh.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("locale file structure", () => {
  const koKeys = flattenKeys(ko);
  const locales = { en, ja, zh };

  it("ko.json is non-empty", () => {
    expect(koKeys.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(locales))(
    "%s.json has no extra keys beyond ko.json",
    (_name, data) => {
      const keys = flattenKeys(data as Record<string, unknown>);
      const extra = keys.filter((k) => !koKeys.includes(k));
      expect(extra).toEqual([]);
    },
  );

  it.each(Object.entries(locales))(
    "%s.json missing-key report (warning only)",
    (name, data) => {
      const keys = flattenKeys(data as Record<string, unknown>);
      const missing = koKeys.filter((k) => !keys.includes(k));
      if (missing.length > 0) {
        console.warn(`[${name}] missing keys:`, missing);
      }
      expect(true).toBe(true);
    },
  );
});
