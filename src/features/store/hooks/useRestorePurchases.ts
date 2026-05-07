import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppServicesContext";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type { Entitlement } from "@/src/core/domain/models";

export interface RestoreVerificationService {
  verifyByProductIdAsync(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement>;
}

export interface RestoreSummary {
  totalAttempted: number;
  restoredCount: number;
}

export interface RunRestorePurchasesDeps {
  billingGateway: BillingGateway;
  purchaseVerification: RestoreVerificationService;
}

export async function runRestorePurchasesAsync(
  deps: RunRestorePurchasesDeps,
): Promise<RestoreSummary> {
  const purchases = await deps.billingGateway.queryActivePurchasesAsync();
  if (purchases.length === 0) {
    return { totalAttempted: 0, restoredCount: 0 };
  }
  const results = await Promise.allSettled(
    purchases.map((p) =>
      deps.purchaseVerification.verifyByProductIdAsync({
        productId: p.productId,
        purchaseToken: p.purchaseToken,
      }),
    ),
  );
  const restoredCount = results.filter((r) => r.status === "fulfilled").length;
  return { totalAttempted: purchases.length, restoredCount };
}

export function useRestorePurchases() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation<RestoreSummary, Error>({
    mutationFn: () =>
      runRestorePurchasesAsync({ billingGateway, purchaseVerification }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    },
  });
}
