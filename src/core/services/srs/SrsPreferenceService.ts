import type { AppMetaStore } from "@/src/core/repositories/contracts/AppMetaStore";
import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";

const KEY = "srs.algorithm";
const DEFAULT_ALGORITHM: SrsAlgorithmId = "leitner";

export class SrsPreferenceService {
  constructor(private readonly appMeta: AppMetaStore) {}

  async getAlgorithmAsync(): Promise<SrsAlgorithmId> {
    const raw = await this.appMeta.getValueAsync(KEY);
    if (raw === "leitner" || raw === "sm2") return raw;
    return DEFAULT_ALGORITHM;
  }

  async setAlgorithmAsync(id: SrsAlgorithmId): Promise<void> {
    await this.appMeta.setValueAsync(KEY, id);
  }
}
