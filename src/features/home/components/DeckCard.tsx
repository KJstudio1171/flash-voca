import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { CircularProgress } from "@/src/shared/ui/CircularProgress";

type DeckCardProps = {
  title: string;
  cardCount: number;
  dueCount: number;
  masteredCount: number;
  onPress: () => void;
};

function DeckCardComponent({
  title,
  cardCount,
  dueCount,
  masteredCount,
  onPress,
}: DeckCardProps) {
  const { colors } = useTheme();
  const progress = cardCount > 0 ? masteredCount / cardCount : 0;
  const isDone = dueCount === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
        },
        pressed && styles.pressed,
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
          {
            backgroundColor: isDone ? colors.surfaceStrong : colors.primary,
          },
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
    </Pressable>
  );
}

export const DeckCard = memo(DeckCardComponent);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.m,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
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
