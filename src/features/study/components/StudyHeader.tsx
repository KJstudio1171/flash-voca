import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@/src/shared/theme/tokens";

type StudyHeaderProps = {
  deckTitle: string;
  currentIndex: number;
  totalCards: number;
  dueCount: number;
  masteredCount: number;
};

function StudyHeaderComponent({
  deckTitle,
  currentIndex,
  totalCards,
  dueCount,
  masteredCount,
}: StudyHeaderProps) {
  const progress = totalCards > 0 ? currentIndex / totalCards : 0;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {deckTitle}
        </Text>
        <Text style={styles.streak}>🔥</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.countersRow}>
        <Text style={styles.counter}>{currentIndex} / {totalCards}</Text>
        <View style={styles.countersRight}>
          <Text style={[styles.counterLabel, { color: tokens.colors.accent }]}>
            {dueCount} due
          </Text>
          <Text style={[styles.counterLabel, { color: tokens.colors.primary }]}>
            {masteredCount} mastered
          </Text>
        </View>
      </View>
    </View>
  );
}

export const StudyHeader = memo(StudyHeaderComponent);

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  streak: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: tokens.colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: tokens.colors.primary,
  },
  countersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.muted,
  },
  countersRight: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
