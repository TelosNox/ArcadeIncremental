import { describe, expect, it } from 'vitest';
import {
  computeBreakCurveScore,
  computeBreakProgress,
  computeSkillMultiplier,
  hasReachedBreak,
} from '../../../src/arcade/machines/machine01-whackamole/breakCondition';
import { Decimal } from '../../../src/core/BigNumber';

describe('computeSkillMultiplier', () => {
  it('returns 1 at the assumed baseline average score per run (280)', () => {
    expect(computeSkillMultiplier(280)).toBe(1);
  });

  it('scales linearly with average score above the baseline', () => {
    expect(computeSkillMultiplier(560)).toBe(2);
  });

  it('clamps to the spec-mandated floor of 0.5 for weak performance', () => {
    expect(computeSkillMultiplier(56)).toBe(0.5); // 56/280 = 0.2, geclampt auf 0.5
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
    // avg = 1400/5 = 280 -> m = 1, score(5,1) ~= 63 < 100
    expect(hasReachedBreak(5, new Decimal(1400))).toBe(false);
  });

  it('is true once the curve crosses S_break for an average player', () => {
    // avg = 3360/12 = 280 -> m = 1, score(12,1) ~= 110 >= 100
    expect(hasReachedBreak(12, new Decimal(3360))).toBe(true);
  });

  it('reaches break sooner for a skilled player (higher average score)', () => {
    // avg = 2800/5 = 560 -> m = 2, score(5,2) klar über 100
    expect(hasReachedBreak(5, new Decimal(2800))).toBe(true);
  });

  // Regressionstest für den realen Playtest-Datenpunkt (423 Punkte, erster
  // Run ohne Upgrades, "nicht perfekt, aber relativ gut"): mit der alten
  // Baseline (150) hätte das m≈3.3 ergeben und den Break schon bei Run 3
  // ausgelöst (der real gemeldete Bug). Mit der neu kalibrierten Baseline
  // (280, m≈1.51) bleibt der Break bei konstant 423 Punkten/Run bis Run 6 aus
  // und löst bei Run 7 aus — siehe Test darunter.
  it('no longer breaks by run 3 for the real 423-points-per-run playtest data (Regressionstest)', () => {
    expect(hasReachedBreak(3, new Decimal(423 * 3))).toBe(false);
  });

  it('matches the recalibrated ~7-run expectation for the 423-points-per-run playtest data', () => {
    expect(hasReachedBreak(6, new Decimal(423 * 6))).toBe(false);
    expect(hasReachedBreak(7, new Decimal(423 * 7))).toBe(true);
  });
});

describe('computeBreakProgress', () => {
  it('is 0 before any runs have been played', () => {
    expect(computeBreakProgress(0, new Decimal(0))).toBe(0);
  });

  it('grows monotonically with run count for a fixed average score', () => {
    const early = computeBreakProgress(3, new Decimal(840)); // avg 280
    const later = computeBreakProgress(8, new Decimal(2240)); // avg 280
    expect(later).toBeGreaterThan(early);
  });

  it('reaches exactly 1 once the curve crosses S_break, never higher', () => {
    // avg = 3360/12 = 280 -> m = 1, score(12,1) liegt bereits über S_break
    expect(computeBreakProgress(12, new Decimal(3360))).toBe(1);
  });

  it('stays in sync with hasReachedBreak (progress >= 1 iff broken)', () => {
    expect(hasReachedBreak(5, new Decimal(1400))).toBe(computeBreakProgress(5, new Decimal(1400)) >= 1);
    expect(hasReachedBreak(12, new Decimal(3360))).toBe(computeBreakProgress(12, new Decimal(3360)) >= 1);
  });
});
