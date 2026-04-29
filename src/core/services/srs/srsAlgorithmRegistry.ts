import { FsrsAlgorithm } from "@/src/core/services/srs/FsrsAlgorithm";
import { LeitnerAlgorithm } from "@/src/core/services/srs/LeitnerAlgorithm";
import { Sm2Algorithm } from "@/src/core/services/srs/Sm2Algorithm";
import type {
  SrsAlgorithm,
  SrsAlgorithmId,
} from "@/src/core/services/srs/SrsAlgorithm";

const REGISTRY: Record<SrsAlgorithmId, SrsAlgorithm> = {
  leitner: new LeitnerAlgorithm(),
  sm2: new Sm2Algorithm(),
  fsrs: new FsrsAlgorithm(),
};

export function getSrsAlgorithm(id: SrsAlgorithmId): SrsAlgorithm {
  return REGISTRY[id];
}
