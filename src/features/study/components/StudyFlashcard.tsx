import { memo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { tokens } from "@/src/shared/theme/tokens";

type StudyFlashcardProps = {
  card: StudyCard;
  disabled?: boolean;
  onRate: (rating: 1 | 2 | 3) => void;
};

function StudyFlashcardComponent({
  card,
  disabled = false,
  onRate,
}: StudyFlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const masteryLabel =
    card.state == null ? "New" : `Mastery ${card.state.masteryLevel}`;

  return (
    <View style={styles.root}>
      <SwipeStudyCard
        disabled={disabled}
        leftActionLabel="Again"
        upActionLabel="Good"
        rightActionLabel="Easy"
        onSwipeComplete={(direction) => {
          const ratingMap = { left: 1, up: 2, right: 3 } as const;
          onRate(ratingMap[direction]);
        }}
      >
        <AnimatedFlipCard
          back={
            <View style={[styles.card, styles.cardBack]}>
              <View style={styles.cardCenter}>
                <Text style={[styles.label, { color: tokens.colors.accent }]}>MEANING</Text>
                <Text style={styles.meaningText}>{card.card.meaning}</Text>
              </View>
            </View>
          }
          flipped={flipped}
          onPress={() => {
            if (!disabled) {
              setFlipped((current) => !current);
            }
          }}
        >
          <View style={[styles.card, styles.cardFront]}>
            <View style={styles.masteryBadge}>
              <Text style={styles.masteryText}>{masteryLabel}</Text>
            </View>
            <View style={styles.cardCenter}>
              <Text style={styles.label}>TERM</Text>
              <Text style={styles.termText}>{card.card.term}</Text>
              <Text style={styles.hint}>tap to flip</Text>
            </View>
          </View>
        </AnimatedFlipCard>
      </SwipeStudyCard>

      <Text style={styles.swipeHint}>← Again   ↑ Good   Easy →</Text>
    </View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  card: {
    minHeight: 240,
    borderRadius: tokens.radius.l,
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  cardFront: {
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  cardBack: {
    borderWidth: 2,
    borderColor: tokens.colors.accent,
  },
  masteryBadge: {
    position: "absolute",
    top: tokens.spacing.m,
    left: tokens.spacing.m,
    backgroundColor: tokens.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  masteryText: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  cardCenter: {
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: tokens.colors.primary,
  },
  termText: {
    fontSize: 36,
    fontWeight: "800",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  meaningText: {
    fontSize: 34,
    fontWeight: "800",
    color: tokens.colors.ink,
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: tokens.colors.muted,
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 12,
    color: tokens.colors.muted,
  },
});
