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
import {
  calculateHomeProgress,
  countDeckSummaryDueCards,
  countDeckSummaryMasteredCards,
  countStudyCardsDue,
  countStudyCardsMastered,
} from "@/src/core/services/study/StudyProgressCalculator";

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
    const allStates = await this.studyRepository.listCardStatesByDeckIdsAsync(
      decks.map((d) => d.id),
      id,
    );
    const statesByDeck = new Map<string, typeof allStates>();
    for (const state of allStates) {
      const list = statesByDeck.get(state.deckId) ?? [];
      list.push(state);
      statesByDeck.set(state.deckId, list);
    }
    return decks.map((deck) => {
      const states = statesByDeck.get(deck.id) ?? [];
      const dueCount = countDeckSummaryDueCards(deck.cardCount, states);
      const masteredCount = countDeckSummaryMasteredCards(states);
      return { ...deck, dueCount, masteredCount };
    });
  }

  async getHomeSummaryAsync(userId?: string): Promise<HomeSummary> {
    const id = userId ?? this.auth.getCurrentUserId();
    const [decks, reviewStats] = await Promise.all([
      this.listDeckSummariesAsync(id),
      this.studyRepository.getHomeReviewStatsAsync(id),
    ]);
    const progress = calculateHomeProgress(decks);

    return {
      decks,
      stats: {
        ...reviewStats,
        ...progress,
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
    const dueCount = countStudyCardsDue(cards);
    const masteredCount = countStudyCardsMastered(cards);

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
