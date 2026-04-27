import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { fadeInScale } from "@/src/shared/animation/motionPresets";
import { useScalePress } from "@/src/shared/animation/useScalePress";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HomeRecommendedBundleCardProps = {
  title: string;
  meta: string;
  bookTitle: string;
  bookSub: string;
  actionLabel: string;
  onPress: () => void;
};

export function HomeRecommendedBundleCard({
  title,
  meta,
  bookTitle,
  bookSub,
  actionLabel,
  onPress,
}: HomeRecommendedBundleCardProps) {
  const { colors } = useTheme();
  const { animatedStyle, pressHandlers } = useScalePress();

  return (
    <Animated.View entering={fadeInScale(80)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={pressHandlers.onPressIn}
        onPressOut={pressHandlers.onPressOut}
        style={[styles.root, tokens.elevation.soft, animatedStyle]}
      >
        <LinearGradient
          colors={[colors.info, colors.primary]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.onPrimary }]}>{title}</Text>
            <Text style={[styles.meta, { color: colors.overlayWhite }]}>{meta}</Text>
            <View style={[styles.action, { backgroundColor: colors.surface }]}>
              <Text style={[styles.actionLabel, { color: colors.info }]}>
                {actionLabel}
              </Text>
            </View>
          </View>

          <View style={styles.bookStack}>
            <View style={[styles.backBook, { backgroundColor: colors.primarySoftStrong }]} />
            <View style={[styles.frontBook, { backgroundColor: colors.surface }]}>
              <Text style={[styles.bookTitle, { color: colors.primary }]}>{bookTitle}</Text>
              <Text style={[styles.bookSub, { color: colors.muted }]}>{bookSub}</Text>
              <MaterialCommunityIcons
                color={colors.info}
                name="account-school-outline"
                size={30}
              />
            </View>
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: tokens.radius.m,
  },
  gradient: {
    borderRadius: tokens.radius.m,
    flexDirection: "row",
    minHeight: 156,
    overflow: "hidden",
    padding: tokens.spacing.l,
  },
  copy: {
    flex: 1,
    gap: tokens.spacing.xs,
    justifyContent: "center",
  },
  title: {
    ...tokens.typography.heading,
  },
  meta: {
    ...tokens.typography.bodyBold,
  },
  action: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.pill,
    marginTop: tokens.spacing.m,
    paddingHorizontal: tokens.spacing.l,
    paddingVertical: 10,
  },
  actionLabel: {
    ...tokens.typography.bodyBold,
  },
  bookStack: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 112,
  },
  backBook: {
    borderRadius: 10,
    height: 92,
    position: "absolute",
    right: 4,
    top: 28,
    transform: [{ rotate: "4deg" }],
    width: 66,
  },
  frontBook: {
    alignItems: "center",
    borderRadius: 10,
    gap: 2,
    height: 104,
    justifyContent: "center",
    padding: tokens.spacing.s,
    width: 78,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  bookSub: {
    ...tokens.typography.label,
  },
});
