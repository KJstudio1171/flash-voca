import { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type AppScreenFrameProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  safeAreaStyle?: StyleProp<ViewStyle>;
  bottomInset?: "default" | "tabs" | "fab" | "none";
  headerSlot?: ReactNode;
  floatingSlot?: ReactNode;
}>;

export function AppScreenFrame({
  children,
  scroll = true,
  contentStyle,
  safeAreaStyle,
  bottomInset = "default",
  headerSlot,
  floatingSlot,
}: AppScreenFrameProps) {
  const { colors } = useTheme();
  const paddingBottom = bottomPaddingByInset[bottomInset];
  const content = (
    <View
      style={[
        styles.content,
        !scroll ? styles.fixedContent : null,
        { paddingBottom },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: colors.canvas }, safeAreaStyle]}
    >
      {headerSlot}
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
      {floatingSlot}
    </SafeAreaView>
  );
}

const bottomPaddingByInset = {
  default: tokens.spacing.xxl,
  tabs: 110,
  fab: 150,
  none: 0,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: tokens.spacing.xl,
  },
  fixedContent: {
    flex: 1,
  },
});
