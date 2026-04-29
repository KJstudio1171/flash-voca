import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { StoreBundleSummary } from "@/src/core/domain/models";
import { staggeredList } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type StoreBundleGridCardProps = {
  bundle: StoreBundleSummary;
  index: number;
  metaLabel: string;
  lockedLabel: string;
  ownedLabel: string;
  onPress: () => void;
};

export function StoreBundleGridCard({
  bundle,
  index,
  metaLabel,
  lockedLabel,
  ownedLabel,
  onPress,
}: StoreBundleGridCardProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();
  const gradientEnd = bundle.owned ? colors.primary : bundle.coverColor;

  return (
    <Animated.View entering={staggeredList(index)} style={styles.wrapper}>
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
        <LinearGradient
          colors={[bundle.coverColor, gradientEnd]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.cover}
        >
          <View style={styles.coverOverlay} />
          <Text numberOfLines={2} style={[styles.title, { color: colors.onPrimary }]}>
            {bundle.title}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: colors.overlayWhite }]}>
            {metaLabel}
          </Text>
          <View style={styles.illustration}>
            <MaterialCommunityIcons
              color={colors.overlayWhite}
              name={categoryIconForTitle(bundle.title)}
              size={54}
            />
          </View>
          <View style={[styles.lockBadge, { backgroundColor: colors.overlayWhite }]}>
            <MaterialCommunityIcons
              color={bundle.owned ? colors.primary : colors.ink}
              name={bundle.owned ? "check" : "lock"}
              size={28}
            />
          </View>
        </LinearGradient>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.ink }]}>{bundle.priceText}</Text>
          <Text style={[styles.status, { color: bundle.owned ? colors.primary : colors.muted }]}>
            {bundle.owned ? ownedLabel : lockedLabel}
          </Text>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function categoryIconForTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("travel")) return "airplane";
  if (normalized.includes("business")) return "briefcase-outline";
  if (normalized.includes("jlpt")) return "ideogram-cjk";
  return "book-open-page-variant-outline";
}

const styles = StyleSheet.create({
  wrapper: {
    width: "48%",
  },
  root: {
    borderRadius: tokens.radius.m,
    borderWidth: tokens.borderWidth.hairline,
    overflow: "hidden",
  },
  cover: {
    minHeight: 156,
    overflow: "hidden",
    padding: tokens.spacing.m,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  title: {
    ...tokens.typography.subheading,
  },
  meta: {
    ...tokens.typography.body,
    marginTop: 4,
  },
  illustration: {
    bottom: tokens.spacing.m,
    left: tokens.spacing.m,
    opacity: tokens.opacity.prominent,
    position: "absolute",
  },
  lockBadge: {
    alignItems: "center",
    borderRadius: tokens.radius.s,
    bottom: tokens.spacing.l,
    height: 42,
    justifyContent: "center",
    opacity: tokens.opacity.prominent,
    position: "absolute",
    right: tokens.spacing.l,
    width: 42,
  },
  footer: {
    gap: 2,
    padding: tokens.spacing.m,
  },
  price: {
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
  },
  status: {
    ...tokens.typography.captionBold,
  },
});
