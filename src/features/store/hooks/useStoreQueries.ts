import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export const storeQueryKeys = {
  all: ["store", "bundles"] as const,
  detail: (bundleId: string) => ["store", "bundles", bundleId] as const,
};

export function useBundleCatalogQuery() {
  const { storeService } = useAppServices();

  return useQuery({
    queryKey: storeQueryKeys.all,
    queryFn: () => storeService.listCatalogAsync(),
  });
}

export function useBundleDetailQuery(bundleId: string) {
  const { storeService } = useAppServices();

  return useQuery({
    queryKey: storeQueryKeys.detail(bundleId),
    queryFn: () => storeService.getBundleDetailAsync(bundleId),
  });
}
