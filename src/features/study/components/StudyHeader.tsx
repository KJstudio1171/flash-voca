import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type StudyHeaderProps = {
  currentIndex: number;
  totalCards: number;
};

function StudyHeaderComponent({
  currentIndex,
  totalCards,
}: StudyHeaderProps) {
  const { colors } = useTheme();
  const progress = totalCards > 0 ? currentIndex / totalCards : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.progressTrack, { backgroundColor: colors.line }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>
      <Text style={[styles.counter, { color: colors.muted }]}>
        {currentIndex} / {totalCards}
      </Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.line }]}>
        <View style={styles.progressSpacer} />
      </View>
    </View>
  );
}

export const StudyHeader = memo(StudyHeaderComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.m,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  counter: {
    ...tokens.typography.body,
    minWidth: 72,
    textAlign: "center",
  },
  progressSpacer: {
    height: "100%",
  },
});
