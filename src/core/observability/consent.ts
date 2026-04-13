import type { KeyValueStore } from "@/src/core/observability/storage";

export type ConsentChannels = {
  errorReports: boolean;
  analytics: boolean;
};

const KEY_ERROR = "consent_error_reports";
const KEY_ANALYTICS = "consent_analytics";
const KEY_DECIDED = "consent_decided_at";

export class ConsentStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<ConsentChannels> {
    const values = await this.store.getMany([KEY_ERROR, KEY_ANALYTICS]);
    return {
      errorReports: values.get(KEY_ERROR) === "true",
      analytics: values.get(KEY_ANALYTICS) === "true",
    };
  }

  async setErrorReports(enabled: boolean): Promise<void> {
    await this.store.set(KEY_ERROR, enabled ? "true" : "false");
  }

  async setAnalytics(enabled: boolean): Promise<void> {
    await this.store.set(KEY_ANALYTICS, enabled ? "true" : "false");
  }

  async hasDecided(): Promise<boolean> {
    return Boolean(await this.store.get(KEY_DECIDED));
  }

  async markDecided(): Promise<void> {
    await this.store.set(KEY_DECIDED, new Date().toISOString());
  }
}
