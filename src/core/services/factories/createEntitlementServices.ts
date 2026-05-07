import type { SqliteEntitlementRepository } from "@/src/core/repositories/sqlite/SqliteEntitlementRepository";
import { SupabaseEntitlementGateway } from "@/src/core/repositories/supabase/SupabaseEntitlementGateway";
import { EntitlementService } from "@/src/core/services/EntitlementService";
import type { AuthService } from "@/src/core/services/auth/AuthService";

export function createEntitlementServices(input: {
  authService: AuthService;
  entitlementRepository: SqliteEntitlementRepository;
}) {
  return {
    entitlementService: new EntitlementService(
      input.entitlementRepository,
      new SupabaseEntitlementGateway(),
      input.authService,
    ),
  };
}
