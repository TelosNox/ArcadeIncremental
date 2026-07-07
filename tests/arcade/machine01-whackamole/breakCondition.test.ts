import { describe, expect, it } from 'vitest';
import {
  computeBreakCurveScore,
  computeBreakProgress,
  computeSkillMultiplier,
  hasReachedBreak,
} from '../../../src/arcade/machines/machine01-whackamole/breakCondition';
import { Decimal } from '../../../src/core/BigNumber';

describe('computeSkillMultiplier', () => {
  it('returns 1 at the assumed baseline average score per run (150)', () => {
    expect(computeSkillMultiplier(150)).toBe(1);
  });

  it('scales linearly with average score above the baseline', () => {
    expect(computeSkillMultiplier(300)).toBe(2);
  });

  it('clamps to the spec-mandated floor of 0.5 for weak performance', () => {
    expect(computeSkillMultiplier(30)).toBe(0.5); // 30/150 = 0.2, geclampt auf 0.5
  });
});

describe('computeBreakCurveScore', () => {
  it('matches the documented calibration point (m=1, n=10 -> score ~= S_break)', () => {
    // SPECIFICATION.md Abschnitt 4: k_avg=9.1 wurde genau dafür kalibriert,
    // dass ein Durchschnittsspieler (m=1) nach ~10 Runs den Break auslöst.
    expect(computeBreakCurveScore(10, 1)).toBeCloseTo(100, 0);
  });

  it('increases with run count', () => {
    expect(computeBreakCurveScore(5, 1)).toBeLessThan(computeBreakCurveScore(10, 1));
  });

  it('reaches the break threshold faster for higher skill multipliers', () => {
    expect(computeBreakCurveScore(5, 2)).toBeGreaterThan(computeBreakCurveScore(5, 1));
  });
});

describe('hasReachedBreak', () => {
  it('is false before any runs have been played', () => {
    expect(hasReachedBreak(0, new Decimal(0))).toBe(false);
  });

  it('is false while the curve is still below S_break for an average player', () => {
    // avg = 750/5 = 150 -> m = 1, score(5,1) ~= 63 < 100
    expect(hasReachedBreak(5, new Decimal(750))).toBe(false);
  });

  it('is true once the curve crosses S_break for an average player', () => {
    // avg = 1800/12 = 150 -> m = 1, score(12,1) ~= 110 >= 100
    expect(hasReachedBreak(12, new Decimal(1800))).toBe(true);
  });

  it('reaches break sooner for a skilled player (higher average score)', () => {
    // avg = 1500/5 = 300 -> m = 2, score(5,2) klar über 100
    expect(hasReachedBreak(5, new Decimal(1500))).toBe(true);
  });

  it('no longer breaks after only 2 runs for a merely competent player (Regressionstest)', () => {
    // Vorher fälschlich schon bei ~200 Punkten/Run (m~5 statt ~1) ausgelöst.
    // avg = 400/2 = 200 -> m = 1.33, score(2, 1.33) liegt klar unter S_break.
    expect(hasReachedBreak(2, new Decimal(400))).toBe(false);
  });
});

describe('computeBreakProgress', () => {
  it('is 0 before any runs have been played', () => {
    expect(computeBreakProgress(0, new Decimal(0))).toBe(0);
  });

  it('grows monotonically with run count for a fixed average score', () => {
    const early = computeBreakProgress(3, new Decimal(450)); // avg 150
    const later = computeBreakProgress(8, new Decimal(1200)); // avg 150
    expect(later).toBeGreaterThan(early);
  });

  it('reaches exactly 1 once the curve crosses S_break, never higher', () => {
    // avg = 1800/12 = 150 -> m = 1, score(12,1) liegt bereits über S_break
    expect(computeBreakProgress(12, new Decimal(1800))).toBe(1);
  });

  it('stays in sync with hasReachedBreak (progress >= 1 iff broken)', () => {
    expect(hasReachedBreak(5, new Decimal(750))).toBe(computeBreakProgress(5, new Decimal(750)) >= 1);
    expect(hasReachedBreak(12, new Decimal(1800))).toBe(computeBreakProgress(12, new Decimal(1800)) >= 1);
  });
});
