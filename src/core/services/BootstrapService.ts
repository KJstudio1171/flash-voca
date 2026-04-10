import { BootstrapError } from "@/src/core/errors";
import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import { seedMvpDataAsync } from "@/src/core/database/seed";

export class BootstrapService {
  async prepareAppAsync() {
    try {
      await initializeDatabaseAsync();
      await seedMvpDataAsync();
    } catch (error) {
      if (error instanceof BootstrapError) {
        throw error;
      }
      throw new BootstrapError({ cause: error });
    }
  }
}
