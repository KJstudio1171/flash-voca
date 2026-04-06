import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService } = useAppServices();
  const [state, setState] = useState<BootstrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        setState("loading");
        await bootstrapService.prepareAppAsync();
        if (isMounted) {
          setState("ready");
        }
      } catch (error) {
        if (isMounted) {
          setState("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to bootstrap the app.",
          );
        }
      }
    }

    void prepare();

    return () => {
      isMounted = false;
    };
  }, [bootstrapService]);

  if (state === "ready") {
    return children;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Flash Voca</Text>
        <Text style={styles.title}>
          {state === "error" ? "Startup issue" : "Preparing local-first workspace"}
        </Text>
        <Text style={styles.message}>
          {state === "error"
            ? errorMessage
            : "SQLite schema, sample data, and service boundaries are loading."}
        </Text>
        {state !== "error" ? (
          <ActivityIndicator color={tokens.colors.primary} style={styles.loader} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.canvas,
    padding: tokens.spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: tokens.radius.l,
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    gap: tokens.spacing.s,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: tokens.colors.primary,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: tokens.colors.ink,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: tokens.colors.muted,
  },
  loader: {
    marginTop: tokens.spacing.s,
  },
});
