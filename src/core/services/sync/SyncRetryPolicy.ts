const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_SECONDS = 30;
const BACKOFF_CAP_SECONDS = 3600;

export function isPermanentSyncFailure(attemptCountAfter: number): boolean {
  return attemptCountAfter >= MAX_ATTEMPTS;
}

export function computeBackoffDate(attemptCountAfter: number): string {
  const seconds = Math.min(
    BACKOFF_BASE_SECONDS * 2 ** (attemptCountAfter - 1),
    BACKOFF_CAP_SECONDS,
  );
  return new Date(Date.now() + seconds * 1000).toISOString();
}
