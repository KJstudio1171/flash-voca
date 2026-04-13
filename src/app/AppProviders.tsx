// src/app/AppProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createErrorHandler } from "@/src/core/errors/handleError";
import { getErrorReporter } from "@/src/core/observability";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { i18next } from "@/src/shared/i18n";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider, useToast } from "@/src/shared/ui/toast";

const AppServicesContext = createContext<AppServices | null>(null);

export function QueryLayer({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(() => {
    const handleError = createErrorHandler(toast, getErrorReporter());
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000 },
        mutations: { onError: handleError },
      },
    });
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: PropsWithChildren) {
  const [services] = useState(() => createAppServices());
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18next}>
          <ThemeProvider>
            <ToastProvider>
              <AppServicesContext.Provider value={services}>
                {children}
              </AppServicesContext.Provider>
            </ToastProvider>
          </ThemeProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error("AppServicesContext is not available.");
  return services;
}
