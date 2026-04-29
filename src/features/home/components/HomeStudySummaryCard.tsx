import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

type HomeStudySummaryCardProps = {
  progress: number;
  studiedCards: number;
  totalCards: number;
  labels: {
    progressLabel: string;
    studiedCards: string;
    studyTime: string;
    streak: string;
    minutesValue: string;
    daysValue: string;
  };
};

export function HomeStudySummaryCard({
  progress,
  studiedCards,
  totalCards,
  labels,
}: HomeStudySummaryCardProps) {
  const { colors } = useTheme();
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <View
      style={[
        styles.root,
        tokens.elevation.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      <CircularProgress
        centerSlot={
          <View style={styles.progressCopy}>
            <Text style={[styles.progressValue, { color: colors.ink }]}>
              {percent}
              <Text style={styles.percentSymbol}>%</Text>
            </Text>
            <Text style={[styles.progressLabel, { color: colors.ink }]}>
              {labels.progressLabel}
            </Text>
          </View>
        }
        color={colors.primary}
        progress={progress}
        size={142}
        strokeWidth={12}
        trackColor={colors.line}
      />

      <View style={[styles.divider, { backgroundColor: colors.line }]} />

      <View style={styles.metrics}>
        <MetricRow
          label={labels.studiedCards}
          value={`${studiedCards} / ${totalCards}`}
        />
        <View style={[styles.rule, { backgroundColor: colors.line }]} />
        <MetricRow
          label={labels.studyTime}
          value={labels.minutesValue}
        />
        <View style={[styles.rule, { backgroundColor: colors.line }]} />
        <MetricRow
          emphasis="accent"
          label={labels.streak}
          value={labels.daysValue}
        />
      </View>
    </View>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
  emphasis?: "default" | "accent";
};

function MetricRow({ label, value, emphasis = "default" }: MetricRowProps) {
  const { colors } = useTheme();
  const valueColor = emphasis === "accent" ? colors.accent : colors.ink;

  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: tokens.radius.l,
    borderWidth: tokens.borderWidth.hairline,
    flexDirection: "row",
    gap: tokens.spacing.l,
    padding: tokens.spacing.m,
  },
  progressCopy: {
    alignItems: "center",
    gap: 2,
  },
  progressValue: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
  },
  percentSymbol: {
    fontSize: 18,
    fontWeight: "800",
  },
  progressLabel: {
    ...tokens.typography.captionBold,
  },
  divider: {
    alignSelf: "stretch",
    width: 1,
  },
  metrics: {
    flex: 1,
    gap: 12,
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.spacing.s,
  },
  metricLabel: {
    ...tokens.typography.captionBold,
  },
  metricValue: {
    ...tokens.typography.bodyBold,
  },
  rule: {
    height: 1,
  },
});
