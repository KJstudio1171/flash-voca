import { memo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { StudyCard } from "@/src/core/domain/models";
import { AnimatedFlipCard } from "@/src/shared/animation/AnimatedFlipCard";
import { cardStackEnter } from "@/src/shared/animation/motionPresets";
import { SwipeStudyCard } from "@/src/shared/animation/SwipeStudyCard";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
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
  const { colors, flashcardTextStyle } = useTheme();
  const [flipped, setFlipped] = useState(false);
  const masteryLabel =
    card.state == null ? "New" : `Mastery ${card.state.masteryLevel}`;

  const frontShadow = Platform.select({
    ios: {
      shadowColor: colors.cardShadowFront,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  });

  const backShadow = Platform.select({
    ios: {
      shadowColor: colors.cardShadowBack,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  });

  return (
    <Animated.View key={card.card.id} entering={cardStackEnter()} style={styles.root}>
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
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface },
                backShadow,
              ]}
            >
              <View style={styles.cardCenter}>
                <Text style={[styles.label, { color: colors.accent }]}>MEANING</Text>
                <Text style={[styles.meaningText, flashcardTextStyle, { color: colors.ink }]}>{card.card.meaning}</Text>
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
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface },
              frontShadow,
            ]}
          >
            <View style={[styles.masteryBadge, { backgroundColor: colors.primarySoftStrong }]}>
              <Text style={[styles.masteryText, { color: colors.primary }]}>{masteryLabel}</Text>
            </View>
            <View style={styles.cardCenter}>
              <Text style={[styles.label, { color: colors.primary }]}>TERM</Text>
              <Text style={[styles.termText, flashcardTextStyle, { color: colors.ink }]}>{card.card.term}</Text>
              <Text style={[styles.hint, { color: colors.muted }]}>tap to flip</Text>
            </View>
          </View>
        </AnimatedFlipCard>
      </SwipeStudyCard>
    </Animated.View>
  );
}

export const StudyFlashcard = memo(StudyFlashcardComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  card: {
    aspectRatio: 0.67,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  masteryBadge: {
    position: "absolute",
    top: tokens.spacing.m,
    left: tokens.spacing.m,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  masteryText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardCenter: {
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  termText: {
    fontSize: 34,
    textAlign: "center",
  },
  meaningText: {
    fontSize: 32,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
  },
});
