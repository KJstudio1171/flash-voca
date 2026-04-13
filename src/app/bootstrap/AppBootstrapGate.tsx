import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { AppError } from "@/src/core/errors";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService } = useAppServices();
  const { colors } = useTheme();
  const { t } = useT();
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
          if (error instanceof AppError) {
            setErrorMessage(t(error.messageKey, error.messageParams));
          } else if (error instanceof Error) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage(t("errors.unknown"));
          }
        }
      }
    }

    void prepare();

    return () => {
      isMounted = false;
    };
  }, [bootstrapService, t]);

  if (state === "ready") {
    return children;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Flash Voca</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? "Startup issue" : "Preparing local-first workspace"}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error"
            ? errorMessage
            : "SQLite schema, sample data, and service boundaries are loading."}
        </Text>
        {state !== "error" ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
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
    padding: tokens.spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    gap: tokens.spacing.s,
  },
  eyebrow: {
    ...tokens.typography.label,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    ...tokens.typography.hero,
  },
  message: {
    ...tokens.typography.body,
  },
  loader: {
    marginTop: tokens.spacing.s,
  },
});
