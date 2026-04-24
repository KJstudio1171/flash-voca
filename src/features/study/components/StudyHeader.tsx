import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
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
  const { colors } = useTheme();
  const progress = totalCards > 0 ? currentIndex / totalCards : 0;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {deckTitle}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.line }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.countersRow}>
        <Text style={[styles.counter, { color: colors.muted }]}>{currentIndex} / {totalCards}</Text>
        <View style={styles.countersRight}>
          <Text style={[styles.counterLabel, { color: colors.accent }]}>
            {dueCount} due
          </Text>
          <Text style={[styles.counterLabel, { color: colors.primary }]}>
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
    ...tokens.typography.heading,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  countersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    ...tokens.typography.label,
  },
  countersRight: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  counterLabel: {
    ...tokens.typography.micro,
  },
});
