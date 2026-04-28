import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "auth.user_id.v1";
const MIGRATION_FLAG_KEY = "auth.migration_v1.done";

export interface UserIdStorage {
  getStoredUserIdAsync(): Promise<string | null>;
  setStoredUserIdAsync(userId: string): Promise<void>;
  isMigrationDoneAsync(): Promise<boolean>;
  markMigrationDoneAsync(): Promise<void>;
}

export class AsyncStorageUserIdStorage implements UserIdStorage {
  async getStoredUserIdAsync() {
    return AsyncStorage.getItem(USER_ID_KEY);
  }

  async setStoredUserIdAsync(userId: string) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  }

  async isMigrationDoneAsync() {
    return (await AsyncStorage.getItem(MIGRATION_FLAG_KEY)) === "1";
  }

  async markMigrationDoneAsync() {
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, "1");
  }
}
