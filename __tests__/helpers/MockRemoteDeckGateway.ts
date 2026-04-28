import type { RemoteDeckGateway } from "@/src/core/repositories/contracts/RemoteDeckGateway";

export function createMockRemoteDeckGateway(
  overrides: Partial<RemoteDeckGateway> = {},
): RemoteDeckGateway {
  return {
    upsertDeckAsync: jest.fn().mockResolvedValue(undefined),
    softDeleteDeckAsync: jest.fn().mockResolvedValue(undefined),
    pullDecksUpdatedAfterAsync: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}
