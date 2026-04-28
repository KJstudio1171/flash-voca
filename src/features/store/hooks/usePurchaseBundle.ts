import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";
import { BillingProductMissingError } from "@/src/core/errors";
import type { Bundle, Entitlement } from "@/src/core/domain/models";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import { useAuthGatedAction } from "@/src/features/store/hooks/useAuthGatedAction";

export interface VerificationService {
  verifyAsync(input: {
    bundleId: string;
    productId: string;
    purchaseToken: string;
  }): Promise<Entitlement>;
}

export interface RunPurchaseBundleDeps {
  billingGateway: BillingGateway;
  purchaseVerification: VerificationService;
  ensureLinkedAsync: () => Promise<void>;
}

export async function runPurchaseBundleAsync(
  bundle: Bundle,
  deps: RunPurchaseBundleDeps,
): Promise<Entitlement> {
  if (!bundle.playProductId) {
    throw new BillingProductMissingError({ context: { bundleId: bundle.id } });
  }
  await deps.ensureLinkedAsync();
  const purchase = await deps.billingGateway.purchaseProductAsync(bundle.playProductId);
  const entitlement = await deps.purchaseVerification.verifyAsync({
    bundleId: bundle.id,
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
  });
  await deps.billingGateway.finishPurchaseAsync(purchase.purchaseToken);
  return entitlement;
}

export function usePurchaseBundle() {
  const { billingGateway, purchaseVerification } = useAppServices();
  const { ensureLinkedAsync } = useAuthGatedAction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bundle: Bundle) =>
      runPurchaseBundleAsync(bundle, {
        billingGateway,
        purchaseVerification,
        ensureLinkedAsync,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
    },
  });
}
