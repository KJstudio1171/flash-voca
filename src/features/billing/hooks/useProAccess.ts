import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { EntitlementStatus } from "@/src/core/domain/models";

export interface ProAccess {
  isPro: boolean;
  expiresAt: string | null;
  status: Extract<EntitlementStatus, "active" | "in_grace" | "cancelled"> | null;
  kind: "subscription" | "lifetime" | null;
  autoRenewing: boolean;
}

const ACTIVE_STATUSES: EntitlementStatus[] = ["active", "in_grace", "cancelled"];

export function useProAccess(): ProAccess {
  const { entitlementService } = useAppServices();

  const { data } = useQuery({
    queryKey: ["entitlements", "pro"],
    queryFn: async () => {
      const list = await entitlementService.listActiveEntitlementsAsync();
      return list.find((e) => e.bundleId === "pro") ?? null;
    },
    staleTime: 60_000,
  });

  if (!data) {
    return { isPro: false, expiresAt: null, status: null, kind: null, autoRenewing: false };
  }

  const isStatusActive = ACTIVE_STATUSES.includes(data.status);
  const isNotExpired =
    data.expiresAt === null || new Date(data.expiresAt) > new Date();
  const isPro = isStatusActive && isNotExpired;

  return {
    isPro,
    expiresAt: data.expiresAt,
    status: isPro ? (data.status as ProAccess["status"]) : null,
    kind: isPro ? (data.kind === "subscription" ? "subscription" : "lifetime") : null,
    autoRenewing: data.autoRenewing,
  };
}
