import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocaleStorage {
  getStoredLocale(): Promise<string | null>;
  setStoredLocale(locale: string): Promise<void>;
}

const STORAGE_KEY = "flash-voca.locale";

export class AsyncStorageLocaleStorage implements LocaleStorage {
  async getStoredLocale(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEY);
  }
  async setStoredLocale(locale: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  }
}
