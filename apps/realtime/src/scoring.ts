export function computePoints(params: {
  currentStreak: number;
  isCorrect: boolean;
  pointsBase: number;
  timeLimitSeconds: number;
  timeSpentMs: number;
}): number {
  if (!params.isCorrect) {
    return 0;
  }

  const totalMs = Math.max(1, params.timeLimitSeconds * 1000);
  const speedFactor = Math.max(0.5, 1 - (params.timeSpentMs / totalMs) * 0.5);
  const streakMultiplier = Math.min(1.5, 1 + params.currentStreak * 0.1);
  return Math.round(params.pointsBase * speedFactor * streakMultiplier);
}
