import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import type { Entitlement } from "@/src/core/domain/models";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";
import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";

export interface RunPurchaseProDeps {
  billingGateway: BillingGateway;
  purchaseVerification:
    | PurchaseVerificationService
    | {
        verifyAsync(input: {
          bundleId: string;
          productId: string;
          purchaseToken: string;
        }): Promise<Entitlement>;
      };
  ensureLinkedAsync: () => Promise<void>;
}

export async function runPurchaseProAsync(
  productId: string,
  deps: RunPurchaseProDeps,
): Promise<Entitlement> {
  await deps.ensureLinkedAsync();
  const purchase = await deps.billingGateway.purchaseProductAsync(productId);
  const entitlement = await deps.purchaseVerification.verifyAsync({
    bundleId: "pro",
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
  });
  await deps.billingGateway.finishPurchaseAsync(purchase.purchaseToken);
  return entitlement;
}

export function usePurchasePro() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const { ensureLinkedAsync } = useAuthGatedAction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      runPurchaseProAsync(productId, {
        billingGateway,
        purchaseVerification,
        ensureLinkedAsync,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["entitlements", "pro"] });
    },
  });
}
