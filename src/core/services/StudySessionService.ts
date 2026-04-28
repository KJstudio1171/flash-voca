import {
  DeckSummary,
  HomeSummary,
  LogReviewInput,
  StudyDeckSnapshot,
} from "@/src/core/domain/models";
import { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";
import type { AuthService } from "@/src/core/services/auth/AuthService";
import type { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";
import { getSrsAlgorithm } from "@/src/core/services/srs/srsAlgorithmRegistry";

export class StudySessionService {
  constructor(
    private readonly deckRepository: DeckRepository,
    private readonly studyRepository: StudyRepository,
    private readonly auth: AuthService,
    private readonly srsPreferenceService: SrsPreferenceService,
  ) {}

  async listDeckSummariesAsync(userId?: string): Promise<DeckSummary[]> {
    const id = userId ?? this.auth.getCurrentUserId();
    const decks = await this.deckRepository.listDecksAsync();
    const summaries = await Promise.all(
      decks.map(async (deck) => {
        const states = await this.studyRepository.listCardStatesAsync(deck.id, id);
        const now = Date.now();
        const notDueCount = states.filter(
          (s) => s.nextReviewAt && new Date(s.nextReviewAt).getTime() > now,
        ).length;
        const dueCount = deck.cardCount - notDueCount;
        const masteredCount = states.filter((s) => s.masteryLevel >= 3).length;
        return { ...deck, dueCount, masteredCount };
      }),
    );
    return summaries;
  }

  async getHomeSummaryAsync(userId?: string): Promise<HomeSummary> {
    const id = userId ?? this.auth.getCurrentUserId();
    const [decks, reviewStats] = await Promise.all([
      this.listDeckSummariesAsync(id),
      this.studyRepository.getHomeReviewStatsAsync(id),
    ]);
    const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
    const masteredCards = decks.reduce((sum, deck) => sum + deck.masteredCount, 0);
    const dueCount = decks.reduce((sum, deck) => sum + deck.dueCount, 0);

    return {
      decks,
      stats: {
        ...reviewStats,
        totalCards,
        dueCount,
        progress: totalCards > 0 ? masteredCards / totalCards : 0,
      },
      recentActivities: reviewStats.recentActivities,
    };
  }

  async getSnapshotAsync(deckId: string, userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    const [deck, states] = await Promise.all([
      this.deckRepository.getDeckByIdAsync(deckId),
      this.studyRepository.listCardStatesAsync(deckId, id),
    ]);

    if (!deck) {
      return null;
    }

    const stateByCardId = new Map(states.map((state) => [state.cardId, state]));
    const cards = deck.cards.map((card) => ({
      card,
      state: stateByCardId.get(card.id) ?? null,
    }));
    const dueCount = cards.filter((item) => {
      if (!item.state?.nextReviewAt) {
        return true;
      }

      return new Date(item.state.nextReviewAt).getTime() <= Date.now();
    }).length;
    const masteredCount = cards.filter((item) => (item.state?.masteryLevel ?? 0) >= 3)
      .length;

    return {
      deck,
      cards,
      dueCount,
      masteredCount,
    } satisfies StudyDeckSnapshot;
  }

  async recordReviewAsync(input: LogReviewInput, userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    const algorithmId = await this.srsPreferenceService.getAlgorithmAsync();
    const algorithm = getSrsAlgorithm(algorithmId);
    return this.studyRepository.logReviewAsync(input, id, algorithm);
  }

  setBookmarkAsync(
    input: { deckId: string; cardId: string; isBookmarked: boolean },
    userId?: string,
  ) {
    const id = userId ?? this.auth.getCurrentUserId();
    return this.studyRepository.setBookmarkAsync(input, id);
  }

  undoLastReviewAsync(deckId: string, userId?: string) {
    const id = userId ?? this.auth.getCurrentUserId();
    return this.studyRepository.undoLastReviewAsync(deckId, id);
  }
}
