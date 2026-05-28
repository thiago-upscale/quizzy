const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

const failedAttempts = new Map<string, number[]>();

function pruneAttempts(timestamps: number[], now: number) {
  return timestamps.filter((timestamp) => now - timestamp <= WINDOW_MS);
}

export function isPinEntryRateLimited(key: string) {
  const now = Date.now();
  const attempts = pruneAttempts(failedAttempts.get(key) ?? [], now);

  if (attempts.length === 0) {
    failedAttempts.delete(key);
    return false;
  }

  failedAttempts.set(key, attempts);
  return attempts.length >= MAX_FAILED_ATTEMPTS;
}

export function registerFailedPinEntry(key: string) {
  const now = Date.now();
  const attempts = pruneAttempts(failedAttempts.get(key) ?? [], now);
  attempts.push(now);
  failedAttempts.set(key, attempts);
  return attempts.length;
}

export function clearFailedPinEntries(key: string) {
  failedAttempts.delete(key);
}

export function getPinEntryLimitConfig() {
  return {
    maxFailedAttempts: MAX_FAILED_ATTEMPTS,
    windowMs: WINDOW_MS,
  };
}
