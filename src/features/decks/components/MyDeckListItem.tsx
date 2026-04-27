import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MyDeckListItemProps = {
  title: string;
  cardCountLabel: string;
  accentColor: string;
  index: number;
  onPress: () => void;
  onEditPress: () => void;
};

export function MyDeckListItem({
  title,
  cardCountLabel,
  accentColor,
  index,
  onPress,
  onEditPress,
}: MyDeckListItemProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();

  return (
    <Animated.View entering={staggeredList(index)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={pressHandlers.onPressIn}
        onPressOut={pressHandlers.onPressOut}
        style={[
          styles.root,
          tokens.elevation.soft,
          { backgroundColor: colors.surface, borderColor: colors.line },
          animatedStyle,
        ]}
      >
        <DeckCover accentColor={accentColor} title={title} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
            {title}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{cardCountLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={onEditPress}
          style={({ pressed }) => [styles.editButton, { opacity: pressed ? 0.55 : 1 }]}
        >
          <MaterialCommunityIcons color={colors.muted} name="pencil-outline" size={28} />
        </Pressable>
      </AnimatedPressable>
    </Animated.View>
  );
}

function DeckCover({ accentColor, title }: { accentColor: string; title: string }) {
  const { colors } = useTheme();
  const words = title.split(/\s+/).filter(Boolean);
  const coverTitle = words.slice(0, 2).join("\n").toUpperCase();

  return (
    <View style={[styles.cover, { backgroundColor: accentColor }]}>
      <View style={[styles.coverGlow, { backgroundColor: colors.overlayWhite }]} />
      <Text numberOfLines={3} style={[styles.coverText, { color: colors.onPrimary }]}>
        {coverTitle}
      </Text>
      <MaterialCommunityIcons
        color={colors.overlayWhite}
        name="account-school-outline"
        size={20}
        style={styles.coverIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    minHeight: 84,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  cover: {
    borderRadius: tokens.radius.s,
    height: 52,
    overflow: "hidden",
    padding: 6,
    width: 52,
  },
  coverGlow: {
    borderRadius: tokens.radius.pill,
    height: 38,
    opacity: 0.18,
    position: "absolute",
    right: -10,
    top: -8,
    width: 38,
  },
  coverText: {
    fontSize: 7,
    fontWeight: "800",
    lineHeight: 9,
  },
  coverIcon: {
    bottom: 5,
    position: "absolute",
    right: 4,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...tokens.typography.subheading,
  },
  meta: {
    ...tokens.typography.body,
  },
  editButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
