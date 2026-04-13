import type { KeyValueStore } from "@/src/core/observability/storage";

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.data.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async getMany(keys: readonly string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const k of keys) {
      const v = this.data.get(k);
      if (v !== undefined) out.set(k, v);
    }
    return out;
  }

  clear(): void {
    this.data.clear();
  }
}
