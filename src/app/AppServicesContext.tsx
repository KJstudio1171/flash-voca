import { PropsWithChildren, createContext, useContext } from "react";

import { AppServices } from "@/src/core/services/createAppServices";

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  children,
  services,
}: PropsWithChildren<{ services: AppServices }>) {
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error("AppServicesContext is not available.");
  return services;
}
