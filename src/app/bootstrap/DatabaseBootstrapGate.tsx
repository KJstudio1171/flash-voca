import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { initializeDatabaseAsync } from "@/src/core/database/initialize";
import {
  AsyncStorageLocaleStorage,
  ExpoLocaleDetector,
  LocaleService,
  initI18next,
} from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";

type DatabaseBootstrapState = "loading" | "ready" | "error";

export function DatabaseBootstrapGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<DatabaseBootstrapState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { colors } = useTheme();

  useEffect(() => {
    let isMounted = true;

    async function prepareDatabase() {
      try {
        setState("loading");
        setErrorMessage(null);
        await initializeDatabaseAsync();
        const localeService = new LocaleService(
          new AsyncStorageLocaleStorage(),
          new ExpoLocaleDetector(),
        );
        const initialLocale = await localeService.resolveInitialLocale();
        await initI18next(initialLocale);
        if (isMounted) setState("ready");
      } catch (error) {
        if (!isMounted) return;
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Database initialization failed.",
        );
      }
    }

    void prepareDatabase();

    return () => {
      isMounted = false;
    };
  }, [attempt]);

  if (state === "ready") {
    return children;
  }

  return (
    <AppScreenFrame contentStyle={styles.screenContent} scroll={false}>
      <CardSurface elevation="soft" style={styles.card}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Flash Voca</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? "Startup issue" : "Preparing workspace"}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error" ? errorMessage : "Local data is getting ready."}
        </Text>
        {state === "loading" ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.action}>
            <AppButton onPress={() => setAttempt((value) => value + 1)}>
              Try again
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
  card: {
    alignSelf: "center",
    gap: tokens.spacing.s,
    maxWidth: 420,
    width: "100%",
  },
  screenContent: {
    justifyContent: "center",
  },
  eyebrow: {
    ...tokens.typography.label,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  loader: {
    marginTop: tokens.spacing.s,
  },
  message: {
    ...tokens.typography.body,
  },
  title: {
    ...tokens.typography.hero,
  },
});
