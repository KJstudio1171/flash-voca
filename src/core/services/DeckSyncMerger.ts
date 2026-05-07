import type { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import type { RemoteDeckPayload } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export interface MergeResult {
  applied: number;
  skipped: number;
}

export class DeckSyncMerger {
  constructor(private readonly deckRepo: DeckRepository) {}

  async mergePulledAsync(payloads: RemoteDeckPayload[]): Promise<MergeResult> {
    let applied = 0;
    let skipped = 0;

    for (const payload of payloads) {
      if (await this.deckRepo.hasPendingLocalChangesAsync(payload.deck.id)) {
        skipped++;
        continue;
      }

      const local = await this.deckRepo.getDeckByIdAsync(payload.deck.id);
      if (local && local.updatedAt >= payload.deck.updatedAt) {
        skipped++;
        continue;
      }
      await this.deckRepo.applyRemoteDeckAsync(payload);
      applied++;
    }

    return { applied, skipped };
  }
}
