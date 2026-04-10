import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

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

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [opacity, toast.id, toast.duration, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.surfaceStrong, borderColor: colors.line, opacity },
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
    <Animated.View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </Animated.View>
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
    borderWidth: 1,
  },
  message: {
    ...tokens.typography.body,
  },
});
