import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

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
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <View style={styles.root}>
      <Text style={styles.trophy}>🏆</Text>
      <Text style={styles.title}>세션 완료!</Text>
      <Text style={styles.subtitle}>🔥 {totalCards}장 완료</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.accentSoft }]}>
          <Text style={[styles.statValue, { color: tokens.colors.accent }]}>
            {ratingCounts.again}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.accent }]}>AGAIN</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.surface }]}>
          <Text style={[styles.statValue, { color: tokens.colors.ink }]}>
            {ratingCounts.good}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.muted }]}>GOOD</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: tokens.colors.primarySoft }]}>
          <Text style={[styles.statValue, { color: tokens.colors.primary }]}>
            {ratingCounts.easy}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.colors.primary }]}>EASY</Text>
        </View>
      </View>

      <View style={styles.masteryBar}>
        <View style={styles.masteryHeader}>
          <Text style={styles.masteryLabel}>MASTERY</Text>
          <Text style={styles.masteryPercent}>{masteryPercent}%</Text>
        </View>
        <View style={styles.masteryTrack}>
          <View style={[styles.masteryFill, { width: `${masteryPercent}%` }]} />
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
    backgroundColor: tokens.colors.primarySoft,
    padding: tokens.spacing.xl,
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  trophy: {
    fontSize: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: tokens.colors.ink,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: tokens.colors.primary,
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
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  masteryBar: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: tokens.radius.s,
    padding: tokens.spacing.s,
    gap: tokens.spacing.xs,
  },
  masteryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  masteryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.muted,
    letterSpacing: 0.5,
  },
  masteryPercent: {
    fontSize: 10,
    fontWeight: "700",
    color: tokens.colors.primary,
  },
  masteryTrack: {
    height: 6,
    backgroundColor: tokens.colors.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: tokens.colors.primary,
  },
  restartButton: {
    borderRadius: tokens.radius.pill,
    marginTop: tokens.spacing.xs,
  },
});
