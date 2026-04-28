export interface Product {
  productId: string;
  priceText: string;
  currencyCode: string;
}

export interface PurchaseResult {
  productId: string;
  purchaseToken: string;
}
