// src/app/AppProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createErrorHandler } from "@/src/core/errors/handleError";
import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider, useToast } from "@/src/shared/ui/toast";

const AppServicesContext = createContext<AppServices | null>(null);

function QueryLayer({ children }: PropsWithChildren) {
  const toast = useToast();
  const [queryClient] = useState(() => {
    const handleError = createErrorHandler(toast);
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
        },
        mutations: {
          onError: handleError,
        },
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
        <ThemeProvider>
          <ToastProvider>
            <AppServicesContext.Provider value={services}>
              <QueryLayer>{children}</QueryLayer>
            </AppServicesContext.Provider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);

  if (!services) {
    throw new Error("AppServicesContext is not available.");
  }

  return services;
}
