import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type QuickAction = {
  id: string;
  label: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  tone: "primary" | "info" | "accent" | "muted";
  onPress: () => void;
};

type QuickActionsProps = {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
  compact?: boolean;
};

export function QuickActions({ actions, columns = 4, compact = false }: QuickActionsProps) {
  const itemBasis = `${100 / columns}%` as const;

  return (
    <View style={[styles.grid, { marginHorizontal: -tokens.spacing.xs / 2 }]}>
      {actions.map((action, index) => (
        <QuickActionButton
          action={action}
          compact={compact}
          index={index}
          itemBasis={itemBasis}
          key={action.id}
        />
      ))}
    </View>
  );
}

function QuickActionButton({
  action,
  compact,
  index,
  itemBasis,
}: {
  action: QuickAction;
  compact: boolean;
  index: number;
  itemBasis: `${number}%`;
}) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const iconColor = {
    primary: colors.primary,
    info: colors.info,
    accent: colors.accent,
    muted: colors.muted,
  }[action.tone];

  return (
    <Animated.View
      entering={staggeredList(index)}
      style={[styles.wrapper, { flexBasis: itemBasis }]}
    >
      <AnimatedPressable
        onPress={action.onPress}
        onPressIn={pressHandlers.onPressIn}
        onPressOut={pressHandlers.onPressOut}
        style={[
          styles.item,
          compact ? styles.compactItem : null,
          tokens.elevation.soft,
          { backgroundColor: colors.surface, borderColor: colors.line },
          animatedStyle,
        ]}
      >
        <MaterialCommunityIcons
          color={iconColor}
          name={action.iconName}
          size={compact ? 30 : 34}
        />
        <Text style={[styles.label, { color: iconColor }]} numberOfLines={2}>
          {action.label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: tokens.spacing.s,
  },
  wrapper: {
    paddingHorizontal: tokens.spacing.xs / 2,
  },
  item: {
    alignItems: "center",
    aspectRatio: 0.9,
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    gap: tokens.spacing.s,
    justifyContent: "center",
    padding: tokens.spacing.s,
  },
  compactItem: {
    aspectRatio: 1.1,
    gap: tokens.spacing.xs,
  },
  label: {
    ...tokens.typography.label,
    textAlign: "center",
  },
});
