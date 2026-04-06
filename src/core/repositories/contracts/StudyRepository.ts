import { LogReviewInput, UserCardState } from "@/src/core/domain/models";

export interface StudyRepository {
  listCardStatesAsync(deckId: string, userId: string): Promise<UserCardState[]>;
  logReviewAsync(input: LogReviewInput, userId: string): Promise<void>;
}
