import { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
  rightSlot?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  title,
  subtitle,
  scroll = true,
  rightSlot,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.content, contentStyle]}>
      <AnimatedScreen style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </AnimatedScreen>
      <AnimatedScreen delay={80} style={styles.body}>
        {children}
      </AnimatedScreen>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.l,
    paddingTop: tokens.spacing.s,
    gap: tokens.spacing.l,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.s,
  },
  headerCopy: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    gap: tokens.spacing.l,
  },
});
