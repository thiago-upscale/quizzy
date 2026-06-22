import { describe, expect, it } from "vitest";
import { computePoints } from "./scoring.js";

const BASE = {
  currentStreak: 0,
  isCorrect: true,
  pointsBase: 1000,
  timeLimitSeconds: 20,
  timeSpentMs: 0,
};

describe("computePoints", () => {
  it("returns 0 for wrong answers regardless of speed", () => {
    expect(
      computePoints({ ...BASE, isCorrect: false, timeSpentMs: 0 }),
    ).toBe(0);
    expect(
      computePoints({ ...BASE, isCorrect: false, timeSpentMs: 5000 }),
    ).toBe(0);
  });

  it("returns full points for instant correct answer with no streak", () => {
    // speedFactor = max(0.5, 1 - 0) = 1.0, streakMultiplier = 1.0
    expect(computePoints({ ...BASE, timeSpentMs: 0 })).toBe(1000);
  });

  it("returns half points when answering at exactly the time limit", () => {
    // speedFactor = max(0.5, 1 - 1.0 * 0.5) = 0.5, streakMultiplier = 1.0
    expect(
      computePoints({ ...BASE, timeSpentMs: BASE.timeLimitSeconds * 1000 }),
    ).toBe(500);
  });

  it("clamps speedFactor to 0.5 even if time spent exceeds limit", () => {
    expect(
      computePoints({ ...BASE, timeSpentMs: BASE.timeLimitSeconds * 2000 }),
    ).toBe(500);
  });

  it("applies streak bonus: +10% per streak, capped at 1.5×", () => {
    // streak=1: multiplier = 1.1
    expect(computePoints({ ...BASE, currentStreak: 1 })).toBe(
      Math.round(1000 * 1.0 * 1.1),
    );
    // streak=5: multiplier = 1.5
    expect(computePoints({ ...BASE, currentStreak: 5 })).toBe(
      Math.round(1000 * 1.0 * 1.5),
    );
    // streak=10: multiplier still capped at 1.5
    expect(computePoints({ ...BASE, currentStreak: 10 })).toBe(
      Math.round(1000 * 1.0 * 1.5),
    );
  });

  it("combines speed and streak correctly at mid-speed", () => {
    // timeSpentMs = 10s out of 20s → speedFactor = max(0.5, 1 - 0.5*0.5) = 0.75
    // streak=2 → streakMultiplier = 1.2
    expect(
      computePoints({ ...BASE, currentStreak: 2, timeSpentMs: 10_000 }),
    ).toBe(Math.round(1000 * 0.75 * 1.2));
  });

  it("uses a minimum totalMs of 1ms for zero-second limit edge case", () => {
    // timeLimitSeconds=0 → totalMs=1, timeSpentMs=0 → speedFactor=1
    expect(
      computePoints({ ...BASE, timeLimitSeconds: 0, timeSpentMs: 0 }),
    ).toBe(1000);
  });
});
