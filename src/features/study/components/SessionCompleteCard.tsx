import { memo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";

import { bounceIn, fadeInUp } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
import { useCountUp } from "@/src/shared/animation/useCountUp";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type RatingCounts = {
  again: number;
  hard: number;
  good: number;
  easy: number;
};

type SessionCompleteCardProps = {
  totalCards: number;
  masteredCount: number;
  ratingCounts: RatingCounts;
  onRestart: () => void;
};

function AnimatedCountText({
  target,
  color,
}: {
  target: number;
  color: string;
}) {
  const value = useCountUp(target);
  const animatedProps = useAnimatedProps(
    () =>
      ({
        text: String(Math.round(value.value)),
      }) as unknown as object,
  );
  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={String(target)}
      animatedProps={animatedProps}
      style={[styles.statValue, { color }]}
    />
  );
}

function SessionCompleteCardComponent({
  totalCards,
  masteredCount,
  ratingCounts,
  onRestart,
}: SessionCompleteCardProps) {
  const { colors } = useTheme();
  const { t } = useT();
  const masteryPercent =
    totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  return (
    <Animated.View
      entering={bounceIn()}
      style={[styles.root, { backgroundColor: colors.primarySoft }]}
    >
      <Text style={styles.trophy}>🏆</Text>
      <Text style={[styles.title, { color: colors.ink }]}>세션 완료!</Text>
      <Text style={[styles.subtitle, { color: colors.primary }]}>{totalCards}장 완료</Text>

      <View style={styles.statsRow}>
        <Animated.View
          entering={fadeInUp(0 * motion.delay.stagger)}
          style={[styles.statCard, { backgroundColor: colors.accentSoft }]}
        >
          <AnimatedCountText target={ratingCounts.again} color={colors.accent} />
          <Text style={[styles.statLabel, { color: colors.accent }]}>
            {t("study.ratings.again").toUpperCase()}
          </Text>
        </Animated.View>
        <Animated.View
          entering={fadeInUp(1 * motion.delay.stagger)}
          style={[styles.statCard, { backgroundColor: colors.warningSoft }]}
        >
          <AnimatedCountText target={ratingCounts.hard} color={colors.warning} />
          <Text style={[styles.statLabel, { color: colors.warning }]}>
            {t("study.ratings.hard").toUpperCase()}
          </Text>
        </Animated.View>
        <Animated.View
          entering={fadeInUp(2 * motion.delay.stagger)}
          style={[styles.statCard, { backgroundColor: colors.surface }]}
        >
          <AnimatedCountText target={ratingCounts.good} color={colors.ink} />
          <Text style={[styles.statLabel, { color: colors.muted }]}>
            {t("study.ratings.good").toUpperCase()}
          </Text>
        </Animated.View>
        <Animated.View
          entering={fadeInUp(3 * motion.delay.stagger)}
          style={[styles.statCard, { backgroundColor: colors.primarySoft }]}
        >
          <AnimatedCountText target={ratingCounts.easy} color={colors.primary} />
          <Text style={[styles.statLabel, { color: colors.primary }]}>
            {t("study.ratings.easy").toUpperCase()}
          </Text>
        </Animated.View>
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
    </Animated.View>
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
    padding: 0,
    textAlign: "center",
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
