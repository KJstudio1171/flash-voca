export interface AppMetaStore {
  getValueAsync(key: string): Promise<string | null>;
  setValueAsync(key: string, value: string): Promise<void>;
}
