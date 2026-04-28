import * as ExpoIap from "expo-iap";

import {
  BillingInitError,
  BillingPurchaseCancelledError,
  BillingPurchaseFailedError,
} from "@/src/core/errors";
import type { BillingGateway } from "@/src/core/services/billing/BillingGateway";
import type {
  Product,
  PurchaseResult,
} from "@/src/core/services/billing/types";

export class ExpoIapBillingGateway implements BillingGateway {
  private initialized = false;

  async initializeAsync(): Promise<void> {
    if (this.initialized) return;
    try {
      await ExpoIap.initConnection();
      this.initialized = true;
    } catch (cause) {
      throw new BillingInitError({ cause });
    }
  }

  async fetchProductsAsync(productIds: string[]): Promise<Product[]> {
    if (!this.initialized) await this.initializeAsync();
    if (productIds.length === 0) return [];
    try {
      const products = await ExpoIap.fetchProducts({ skus: productIds, type: "in-app" });
      return (products as any[]).map((p) => ({
        productId: p.id ?? p.productId,
        priceText: p.displayPrice ?? p.localizedPrice ?? p.price ?? "",
        currencyCode: p.currency ?? p.currencyCode ?? "",
      }));
    } catch (cause) {
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async purchaseProductAsync(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) await this.initializeAsync();
    try {
      const purchase = await ExpoIap.requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: "in-app",
      });
      const single: any = Array.isArray(purchase) ? purchase[0] : purchase;
      const purchaseToken = single?.purchaseToken ?? single?.transactionId;
      const resolvedProductId = single?.productId ?? single?.id ?? productId;
      if (!purchaseToken) {
        throw new BillingPurchaseFailedError({ context: { reason: "no_purchase_token" } });
      }
      return { productId: resolvedProductId, purchaseToken };
    } catch (cause: any) {
      const code = cause?.code;
      if (code === ExpoIap.ErrorCode.UserCancelled) {
        throw new BillingPurchaseCancelledError({ cause });
      }
      if (cause instanceof BillingPurchaseCancelledError || cause instanceof BillingPurchaseFailedError) {
        throw cause;
      }
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async finishPurchaseAsync(purchaseToken: string): Promise<void> {
    try {
      await ExpoIap.finishTransaction({ purchase: { purchaseToken } as any, isConsumable: false });
    } catch (cause) {
      throw new BillingPurchaseFailedError({ cause });
    }
  }

  async queryActivePurchasesAsync(): Promise<PurchaseResult[]> {
    if (!this.initialized) await this.initializeAsync();
    try {
      const purchases = await ExpoIap.getAvailablePurchases();
      return (purchases as any[])
        .map((p) => ({
          productId: p.productId ?? p.id,
          purchaseToken: p.purchaseToken ?? p.transactionId,
        }))
        .filter((p) => p.productId && p.purchaseToken);
    } catch (cause) {
      throw new BillingPurchaseFailedError({ cause });
    }
  }
}
