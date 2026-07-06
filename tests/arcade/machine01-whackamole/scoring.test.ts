import { describe, expect, it } from 'vitest';
import { Decimal } from '../../../src/core/BigNumber';
import {
  applyHit,
  applyMiss,
  computeHitScore,
  computeMissPenalty,
  computeZeitBonus,
  type ScoreFormulaParams,
} from '../../../src/arcade/machines/machine01-whackamole/scoring';

// Basis-Parameter ohne Upgrades (entspricht den bisherigen config.ts-Werten),
// damit die Formel unabhängig von computeEffectiveParams() testbar bleibt.
const BASE_PARAMS: ScoreFormulaParams = {
  basisPunkte: 10,
  strafe: 5,
  zeitBonusReferenceMs: 500,
  zeitBonusMin: 0.5,
  zeitBonusMax: 2,
  scoreMultiplier: 1,
};

describe('computeZeitBonus', () => {
  it('returns the maximum bonus for an instant reaction', () => {
    expect(computeZeitBonus(0, BASE_PARAMS)).toBe(2);
  });

  it('returns 1 at the reference reaction time of 500ms', () => {
    expect(computeZeitBonus(500, BASE_PARAMS)).toBe(1);
  });

  it('clamps to the minimum for slow reactions', () => {
    expect(computeZeitBonus(10_000, BASE_PARAMS)).toBe(0.5);
  });

  it('clamps to the maximum for negative/implausible reaction times', () => {
    expect(computeZeitBonus(-100, BASE_PARAMS)).toBe(2);
  });

  it('reflects a wider reference time from the Schnellere-Reflexe upgrade', () => {
    const upgraded: ScoreFormulaParams = { ...BASE_PARAMS, zeitBonusReferenceMs: 550 };
    // Bei gleicher Reaktionszeit (500ms) liefert die verschobene Referenz
    // einen höheren Bonus als ohne Upgrade.
    expect(computeZeitBonus(500, upgraded)).toBeGreaterThan(computeZeitBonus(500, BASE_PARAMS));
  });
});

describe('computeHitScore', () => {
  it('multiplies basis_punkte (10) by the time bonus', () => {
    expect(computeHitScore(500, BASE_PARAMS).eq(10)).toBe(true);
    expect(computeHitScore(0, BASE_PARAMS).eq(20)).toBe(true);
    expect(computeHitScore(10_000, BASE_PARAMS).eq(5)).toBe(true);
  });

  it('rounds to a whole number when the time bonus is fractional', () => {
    // zeit_bonus(137) = 2 - 137/500 = 1.726 -> 10 * 1.726 = 17.26 -> 17
    expect(computeHitScore(137, BASE_PARAMS).eq(17)).toBe(true);
  });

  it('applies the score multiplier from the Score-Multiplikator upgrade', () => {
    const withMultiplier: ScoreFormulaParams = { ...BASE_PARAMS, scoreMultiplier: 1.2 };
    // 10 * 1 (bonus @ 500ms) * 1.2 = 12
    expect(computeHitScore(500, withMultiplier).eq(12)).toBe(true);
  });
});

describe('computeMissPenalty', () => {
  it('equals the strafe constant (5)', () => {
    expect(computeMissPenalty(BASE_PARAMS).eq(5)).toBe(true);
  });

  it('reflects a reduced strafe from the Fehlerverzeihung upgrade', () => {
    expect(computeMissPenalty({ ...BASE_PARAMS, strafe: 3 }).eq(3)).toBe(true);
  });
});

describe('applyHit / applyMiss', () => {
  it('accumulates score across hits and misses (Abschnitt 4a Formel)', () => {
    let score = new Decimal(0);
    score = applyHit(score, 500, BASE_PARAMS); // +10
    score = applyHit(score, 0, BASE_PARAMS); // +20
    score = applyMiss(score, BASE_PARAMS); // -5

    expect(score.eq(25)).toBe(true);
  });

  it('allows the score to go negative when misses dominate', () => {
    let score = new Decimal(0);
    score = applyMiss(score, BASE_PARAMS);
    score = applyMiss(score, BASE_PARAMS);

    expect(score.eq(-10)).toBe(true);
  });
});
