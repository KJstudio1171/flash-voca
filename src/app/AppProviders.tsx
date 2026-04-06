import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";

const AppServicesContext = createContext<AppServices | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );
  const [services] = useState(() => createAppServices());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppServicesContext.Provider value={services}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </AppServicesContext.Provider>
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
