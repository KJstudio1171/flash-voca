import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { fadeInDown } from "@/src/shared/animation/motionPresets";
import { motion } from "@/src/shared/animation/motionTokens";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type Toast = {
  id: string;
  message: string;
  duration: number;
};

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      entering={fadeInDown()}
      exiting={FadeOut.duration(motion.duration.fast)}
      style={[
        styles.toast,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
      ]}
    >
      <Text style={[styles.message, { color: colors.ink }]}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tokens.spacing.xl,
    left: tokens.layout.screenPadding,
    right: tokens.layout.screenPadding,
    alignItems: "center",
    gap: tokens.spacing.s,
  },
  toast: {
    width: "100%",
    paddingVertical: tokens.spacing.m,
    paddingHorizontal: tokens.layout.cardPadding,
    borderRadius: tokens.radius.s,
    borderWidth: tokens.borderWidth.hairline,
  },
  message: {
    ...tokens.typography.body,
  },
});
