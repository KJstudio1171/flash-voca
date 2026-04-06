import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/shared/ui/AppButton";
import { tokens } from "@/src/shared/theme/tokens";

type StudyRatingBarProps = {
  disabled?: boolean;
  onAgain: () => void;
  onGood: () => void;
  onEasy: () => void;
};

function StudyRatingBarComponent({
  disabled = false,
  onAgain,
  onGood,
  onEasy,
}: StudyRatingBarProps) {
  return (
    <View style={styles.row}>
      <AppButton disabled={disabled} onPress={onAgain} style={styles.button} variant="secondary">
        Again
      </AppButton>
      <AppButton disabled={disabled} onPress={onGood} style={styles.button} variant="secondary">
        Good
      </AppButton>
      <AppButton disabled={disabled} onPress={onEasy} style={styles.button}>
        Easy
      </AppButton>
    </View>
  );
}

export const StudyRatingBar = memo(StudyRatingBarComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  button: {
    flex: 1,
  },
});
