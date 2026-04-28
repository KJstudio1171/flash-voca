import type { SrsAlgorithmId } from "@/src/core/services/srs/SrsAlgorithm";
import type { SrsPreferenceService } from "@/src/core/services/srs/SrsPreferenceService";

export function createMockSrsPreferenceService(
  initial: SrsAlgorithmId = "leitner",
): SrsPreferenceService {
  let value: SrsAlgorithmId = initial;
  return {
    getAlgorithmAsync: jest.fn(async () => value),
    setAlgorithmAsync: jest.fn(async (id: SrsAlgorithmId) => {
      value = id;
    }),
  } as unknown as SrsPreferenceService;
}
