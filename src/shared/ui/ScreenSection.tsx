import { PropsWithChildren, ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type ScreenSectionProps = PropsWithChildren<{
  title: string;
  rightSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}>;

export function ScreenSection({
  title,
  rightSlot,
  style,
  titleStyle,
  children,
}: ScreenSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }, titleStyle]}>{title}</Text>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: tokens.spacing.s,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.spacing.s,
  },
  title: {
    ...tokens.typography.heading,
    flex: 1,
  },
});
