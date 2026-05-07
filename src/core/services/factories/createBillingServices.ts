import type { SupabaseClient } from "@supabase/supabase-js";

import type { Entitlement } from "@/src/core/domain/models";
import type { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { ExpoIapBillingGateway } from "@/src/core/services/billing/ExpoIapBillingGateway";
import { NoopBillingGateway } from "@/src/core/services/billing/NoopBillingGateway";
import { NoopPurchaseVerificationService } from "@/src/core/services/billing/NoopPurchaseVerificationService";
import { PurchaseVerificationService } from "@/src/core/services/billing/PurchaseVerificationService";

export function createBillingServices(input: {
  entitlementRepository: SqliteEntitlementRepository;
  supabaseClient: SupabaseClient | null;
}) {
  const billingGateway = input.supabaseClient
    ? new ExpoIapBillingGateway()
    : new NoopBillingGateway();

  const purchaseVerification = input.supabaseClient
    ? new PurchaseVerificationService({
        invokeFunctionAsync: async (name, opts) => {
          const result = await input.supabaseClient!.functions.invoke(name, {
            body: opts.body as Record<string, unknown>,
          });
          return result as { data?: { entitlement: Entitlement }; error?: unknown };
        },
        upsertCachedEntitlementAsync: (entitlement) =>
          input.entitlementRepository.upsertCachedEntitlementAsync(entitlement),
      })
    : new NoopPurchaseVerificationService();

  return {
    billingGateway,
    purchaseVerification,
  };
}
