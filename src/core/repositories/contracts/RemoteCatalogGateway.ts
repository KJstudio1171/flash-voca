export interface RemoteCatalogBundle {
  id: string;
  title: string;
  description: string;
  priceText: string;
  currencyCode: string;
  playProductId: string | null;
  coverColor: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteOfficialDeckSummary {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  accentColor: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteBundleItem {
  id: string;
  bundleId: string;
  deckId: string;
  position: number;
}

export interface RemoteCatalogSnapshot {
  bundles: RemoteCatalogBundle[];
  officialDecks: RemoteOfficialDeckSummary[];
  bundleItems: RemoteBundleItem[];
}

export interface RemoteCatalogGateway {
  pullCatalogAsync(): Promise<RemoteCatalogSnapshot | null>;
}
