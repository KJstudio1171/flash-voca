import { BootstrapError } from "@/src/core/errors";
import { seedMvpDataAsync } from "@/src/core/database/seed";

export class BootstrapService {
  async prepareAppAsync(ownerId: string) {
    try {
      await seedMvpDataAsync(ownerId);
    } catch (error) {
      if (error instanceof BootstrapError) {
        throw error;
      }
      throw new BootstrapError({ cause: error });
    }
  }
}
