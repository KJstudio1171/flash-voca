import { LOCAL_USER_ID } from "@/src/core/config/constants";
import { LogReviewInput, StudyDeckSnapshot } from "@/src/core/domain/models";
import { DeckRepository } from "@/src/core/repositories/contracts/DeckRepository";
import { StudyRepository } from "@/src/core/repositories/contracts/StudyRepository";

export class StudySessionService {
  constructor(
    private readonly deckRepository: DeckRepository,
    private readonly studyRepository: StudyRepository,
  ) {}

  async getSnapshotAsync(deckId: string, userId = LOCAL_USER_ID) {
    const [deck, states] = await Promise.all([
      this.deckRepository.getDeckByIdAsync(deckId),
      this.studyRepository.listCardStatesAsync(deckId, userId),
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

  recordReviewAsync(input: LogReviewInput, userId = LOCAL_USER_ID) {
    return this.studyRepository.logReviewAsync(input, userId);
  }
}
