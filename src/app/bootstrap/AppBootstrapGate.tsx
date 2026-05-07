import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppServicesContext";
import { QueryLayer } from "@/src/app/AppProviders";
import { SupabaseAuthService } from "@/src/core/services/auth/SupabaseAuthService";
import { ObservabilityErrorBoundary } from "@/src/app/ObservabilityErrorBoundary";
import { AppError, SyncError } from "@/src/core/errors";
import {
  ConsoleAnalyticsSink,
  ConsoleErrorSink,
  getErrorReporter,
  initializeObservability,
  trackSafely,
} from "@/src/core/observability";
import { installGlobalErrorHandler } from "@/src/core/observability/globalHandler";
import { i18next, useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService, authService, deckSyncService } = useAppServices();
  const { colors } = useTheme();
  const { t } = useT();
  const [state, setState] = useState<BootstrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        setState("loading");
        await authService.bootstrapAsync();
        await bootstrapService.prepareAppAsync(authService.getCurrentUserId());
        if (authService instanceof SupabaseAuthService) {
          void authService.rebindAnonymousAsync();
        }
        await initializeObservability({
          errorSink: new ConsoleErrorSink(),
          analyticsSink: new ConsoleAnalyticsSink(),
          getLocale: () => i18next.language,
        });
        installGlobalErrorHandler(getErrorReporter());
        trackSafely("app_opened");
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
  }, [bootstrapService, authService, attempt]);

  useEffect(() => {
    if (state !== "ready") return;
    if (!deckSyncService) return;
    void deckSyncService.syncAsync({ trigger: "bootstrap" }).catch((error) => {
      // Silent for the user (they see status on Profile), but we still want
      // visibility in the error reporter so failures aren't fully invisible.
      const appError = error instanceof AppError ? error : new SyncError({ cause: error });
      void getErrorReporter().report(appError);
    });
  }, [state, deckSyncService]);

  if (state === "ready") {
    return (
      <ObservabilityErrorBoundary>
        <QueryLayer>{children}</QueryLayer>
      </ObservabilityErrorBoundary>
    );
  }

  return (
    <AppScreenFrame contentStyle={styles.screenContent} scroll={false}>
      <CardSurface elevation="soft" style={styles.card}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {t("bootstrap.brand")}
        </Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? t("bootstrap.errorTitle") : t("bootstrap.title")}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error" ? errorMessage : t("bootstrap.message")}
        </Text>
        {state !== "error" ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.action}>
            <AppButton onPress={() => setAttempt((value) => value + 1)}>
              {t("bootstrap.retry")}
            </AppButton>
          </View>
        )}
      </CardSurface>
    </AppScreenFrame>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: tokens.spacing.s,
  },
  screenContent: {
    justifyContent: "center",
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 420,
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
