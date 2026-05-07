import type { SupabaseClient } from "@supabase/supabase-js";

import { SyncError } from "@/src/core/errors";
import type {
  RemoteReviewLogPayload,
  RemoteStudyGateway,
  RemoteUserCardStatePayload,
} from "@/src/core/repositories/contracts/RemoteStudyGateway";

export class SupabaseStudyGateway implements RemoteStudyGateway {
  constructor(private readonly client: SupabaseClient) {}

  async upsertReviewLogAsync(
    userId: string,
    payload: RemoteReviewLogPayload,
  ): Promise<void> {
    const { error } = await this.client.from("review_logs").upsert({
      id: payload.id,
      deck_id: payload.deckId,
      card_id: payload.cardId,
      user_id: userId,
      rating: payload.rating,
      elapsed_ms: payload.elapsedMs,
      reviewed_at: payload.reviewedAt,
      previous_srs_state: payload.previousSrsState,
      next_srs_state: payload.nextSrsState,
      deleted_at: null,
    });
    if (error) throw new SyncError({ cause: error });
  }

  async deleteReviewLogAsync(userId: string, reviewLogId: string): Promise<void> {
    const deletedAt = new Date().toISOString();
    const { error } = await this.client
      .from("review_logs")
      .update({ deleted_at: deletedAt })
      .eq("id", reviewLogId)
      .eq("user_id", userId);
    if (error) throw new SyncError({ cause: error });
  }

  async upsertUserCardStateAsync(
    userId: string,
    payload: RemoteUserCardStatePayload,
  ): Promise<void> {
    const { error } = await this.client.from("user_card_states").upsert(
      {
        id: payload.id,
        deck_id: payload.deckId,
        card_id: payload.cardId,
        user_id: userId,
        mastery_level: payload.masteryLevel,
        ease_factor: payload.easeFactor,
        interval_days: payload.intervalDays,
        next_review_at: payload.nextReviewAt,
        last_reviewed_at: payload.lastReviewedAt,
        is_bookmarked: payload.isBookmarked,
        algorithm_data: payload.algorithmData,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      },
      { onConflict: "card_id,user_id" },
    );
    if (error) throw new SyncError({ cause: error });
  }
}
