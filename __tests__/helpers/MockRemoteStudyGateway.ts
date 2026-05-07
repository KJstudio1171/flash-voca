import type { RemoteStudyGateway } from "@/src/core/repositories/contracts/RemoteStudyGateway";

export function createMockRemoteStudyGateway(
  overrides: Partial<RemoteStudyGateway> = {},
): RemoteStudyGateway {
  return {
    upsertReviewLogAsync: jest.fn().mockResolvedValue(undefined),
    deleteReviewLogAsync: jest.fn().mockResolvedValue(undefined),
    upsertUserCardStateAsync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
