import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";

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
    </View>
  );
}

export const StudyHeader = memo(StudyHeaderComponent);

const styles = StyleSheet.create({
  root: {
    width: "100%",
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
});
