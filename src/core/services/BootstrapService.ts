import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import { seedMvpDataAsync } from "@/src/core/database/seed";

export class BootstrapService {
  async prepareAppAsync() {
    await initializeDatabaseAsync();
    await seedMvpDataAsync();
  }
}
