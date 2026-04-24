import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { QueryLayer, useAppServices } from "@/src/app/AppProviders";
import { ObservabilityErrorBoundary } from "@/src/app/ObservabilityErrorBoundary";
import { AppError } from "@/src/core/errors";
import {
  ConsoleAnalyticsSink,
  ConsoleErrorSink,
  getAnalytics,
  getErrorReporter,
  initializeObservability,
} from "@/src/core/observability";
import { installGlobalErrorHandler } from "@/src/core/observability/globalHandler";
import { i18next } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService } = useAppServices();
  const { colors } = useTheme();
  const [state, setState] = useState<BootstrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        setState("loading");
        await bootstrapService.prepareAppAsync();
        await initializeObservability({
          errorSink: new ConsoleErrorSink(),
          analyticsSink: new ConsoleAnalyticsSink(),
          getLocale: () => i18next.language,
        });
        installGlobalErrorHandler(getErrorReporter());
        void getAnalytics().track("app_opened");
        if (isMounted) setState("ready");
      } catch (error) {
        if (isMounted) {
          setState("error");
          if (error instanceof AppError) {
            setErrorMessage(i18next.t(error.messageKey, error.messageParams) as string);
          } else if (error instanceof Error) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage(i18next.t("errors.unknown") as string);
          }
        }
      }
    }

    void prepare();

    return () => {
      isMounted = false;
    };
  }, [bootstrapService]);

  if (state === "ready") {
    return (
      <ObservabilityErrorBoundary>
        <QueryLayer>{children}</QueryLayer>
      </ObservabilityErrorBoundary>
    );
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
