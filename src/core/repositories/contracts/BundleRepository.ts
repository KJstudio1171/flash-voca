import { Bundle, BundleDetail } from "@/src/core/domain/models";

export interface BundleRepository {
  listBundlesAsync(): Promise<Bundle[]>;
  getBundleByIdAsync(bundleId: string): Promise<BundleDetail | null>;
}
