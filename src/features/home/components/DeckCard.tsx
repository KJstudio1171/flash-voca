import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  onPress: () => void;
  index?: number;
};

function DeckCardComponent({
  title,
  cardCount,
  dueCount,
  masteredCount,
  onPress,
  index = 0,
}: DeckCardProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const progress = cardCount > 0 ? masteredCount / cardCount : 0;
  const isDone = dueCount === 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressHandlers.onPressIn}
      onPressOut={pressHandlers.onPressOut}
      entering={staggeredList(index)}
      style={[
        styles.root,
        { backgroundColor: colors.surface, borderColor: colors.line },
        animatedStyle,
      ]}
    >
      <CircularProgress progress={progress} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {cardCount}장 · {dueCount}장 due
        </Text>
      </View>
      <View
        style={[
          styles.action,
          { backgroundColor: isDone ? colors.surfaceStrong : colors.primary },
        ]}
      >
        <Text
          style={[
            styles.actionLabel,
            { color: isDone ? colors.muted : colors.onPrimary },
          ]}
        >
          {isDone ? "Done" : "Study"}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export const DeckCard = memo(DeckCardComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: tokens.borderWidth.hairline,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.m,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...tokens.typography.bodyBold,
  },
  meta: {
    ...tokens.typography.label,
  },
  action: {
    borderRadius: tokens.radius.s,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  actionLabel: {
    ...tokens.typography.label,
  },
});
