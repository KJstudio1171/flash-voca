import type { RemoteCatalogSnapshot } from "@/src/core/repositories/contracts/RemoteCatalogGateway";

export interface CatalogCacheRepository {
  replaceCatalogAsync(snapshot: RemoteCatalogSnapshot): Promise<void>;
}
