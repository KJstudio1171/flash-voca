import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { AppButton } from "@/src/shared/ui/AppButton";
import { tokens } from "@/src/shared/theme/tokens";

type RatingCounts = {
  again: number;
  good: number;
  easy: number;
};

type SessionCompleteCardProps = {
  totalCards: number;
  masteredCount: number;
  ratingCounts: RatingCounts;
  onRestart: () => void;
};

function SessionCompleteCardComponent({
  totalCards,
  masteredCount,
  ratingCounts,
  onRestart,
}: SessionCompleteCardProps) {
  const { colors } = useTheme();
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.primarySoft }]}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={[styles.title, { color: colors.ink }]}>세션 완료!</Text>
      <Text style={[styles.subtitle, { color: colors.primary }]}>🔥 {totalCards}장 완료</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {ratingCounts.again}
          </Text>
          <Text style={[styles.statLabel, { color: colors.accent }]}>AGAIN</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.ink }]}>
            {ratingCounts.good}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>GOOD</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {ratingCounts.easy}
          </Text>
          <Text style={[styles.statLabel, { color: colors.primary }]}>EASY</Text>
        </View>
      </View>

      <View style={[styles.masteryBar, { backgroundColor: colors.overlayWhite }]}>
        <View style={styles.masteryHeader}>
          <Text style={[styles.masteryLabel, { color: colors.muted }]}>MASTERY</Text>
          <Text style={[styles.masteryPercent, { color: colors.primary }]}>{masteryPercent}%</Text>
        </View>
        <View style={[styles.masteryTrack, { backgroundColor: colors.line }]}>
          <View style={[styles.masteryFill, { backgroundColor: colors.primary, width: `${masteryPercent}%` }]} />
        </View>
      </View>

      <AppButton onPress={onRestart} style={styles.restartButton}>
        다시 학습하기
      </AppButton>
    </View>
  );
}

export const SessionCompleteCard = memo(SessionCompleteCardComponent);

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  trophy: {
    fontSize: 56,
  },
  title: {
    ...tokens.typography.hero,
  },
  subtitle: {
    ...tokens.typography.captionBold,
  },
  statsRow: {
    flexDirection: "row",
    gap: tokens.spacing.xs,
    width: "100%",
  },
  statCard: {
    flex: 1,
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    alignItems: "center",
  },
  statValue: {
    ...tokens.typography.heading,
  },
  statLabel: {
    ...tokens.typography.micro,
    letterSpacing: 0.5,
  },
  masteryBar: {
    width: "100%",
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    gap: tokens.spacing.xs,
  },
  masteryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  masteryLabel: {
    ...tokens.typography.micro,
    letterSpacing: 0.5,
  },
  masteryPercent: {
    ...tokens.typography.micro,
  },
  masteryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 3,
  },
  restartButton: {
    borderRadius: tokens.radius.pill,
    marginTop: tokens.spacing.xs,
  },
});
