import { useQuery } from "@tanstack/react-query";

import { useAppServices } from "@/src/app/AppProviders";

export interface ProProduct {
  productId: string;
  kind: "monthly" | "yearly" | "lifetime";
  priceText: string;
  currencyCode: string;
}

function kindFromProductId(
  id: string,
  monthly: string,
  yearly: string,
  lifetime: string,
): ProProduct["kind"] {
  if (id === monthly) return "monthly";
  if (id === yearly) return "yearly";
  if (id === lifetime) return "lifetime";
  return "monthly";
}

export function useProProducts() {
  const { billingGateway } = useAppServices();
  const monthly = process.env.EXPO_PUBLIC_PRO_PRODUCT_MONTHLY ?? "";
  const yearly = process.env.EXPO_PUBLIC_PRO_PRODUCT_YEARLY ?? "";
  const lifetime = process.env.EXPO_PUBLIC_PRO_PRODUCT_LIFETIME ?? "";

  return useQuery({
    queryKey: ["billing", "pro_products", monthly, yearly, lifetime],
    queryFn: async () => {
      const productIds = [monthly, yearly, lifetime].filter(Boolean);
      if (productIds.length === 0) return [] as ProProduct[];
      const products = await billingGateway.fetchProductsAsync(productIds);
      return products.map((p): ProProduct => ({
        productId: p.productId,
        kind: kindFromProductId(p.productId, monthly, yearly, lifetime),
        priceText: p.priceText,
        currencyCode: p.currencyCode,
      }));
    },
    staleTime: 60 * 60 * 1000,
  });
}
