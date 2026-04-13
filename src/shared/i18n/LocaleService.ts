import {
  DEFAULT_LOCALE,
  LanguageCode,
  isSupportedLocale,
} from "@/src/shared/i18n/config";
import type { LocaleDetector } from "@/src/shared/i18n/LocaleDetector";
import type { LocaleStorage } from "@/src/shared/i18n/LocaleStorage";

type LocaleListener = (locale: LanguageCode) => void;

export class LocaleService {
  private listeners: Set<LocaleListener> = new Set();

  constructor(
    private readonly storage: LocaleStorage,
    private readonly detector: LocaleDetector,
  ) {}

  async resolveInitialLocale(): Promise<LanguageCode> {
    const stored = await this.storage.getStoredLocale();
    if (isSupportedLocale(stored)) {
      return stored;
    }
    const device = this.detector.detectDeviceLocale();
    if (isSupportedLocale(device)) {
      return device;
    }
    return DEFAULT_LOCALE;
  }

  async setLocale(locale: string): Promise<void> {
    if (!isSupportedLocale(locale)) {
      throw new Error(`Unsupported locale: ${locale}`);
    }
    await this.storage.setStoredLocale(locale);
    this.listeners.forEach((listener) => listener(locale));
  }

  subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
