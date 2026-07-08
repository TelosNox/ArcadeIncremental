import { describe, expect, it } from 'vitest';
import { Decimal } from '../../../src/core/BigNumber';
import {
  applyHit,
  applyWaveCleared,
  computeHitScore,
  computeSerienBonus,
  computeWaveBonus,
  type ScoreFormulaParams,
} from '../../../src/arcade/machines/machine02-shooter/scoring';

// Basis-Parameter ohne Upgrades (entspricht den config.ts-Werten aus der mit
// dem Nutzer abgestimmten Balance für Automat 2), damit die Formel
// unabhängig von computeEffectiveParams() testbar bleibt.
const BASE_PARAMS: ScoreFormulaParams = {
  basisPunkte: 8,
  serienBonusProTreffer: 0.1,
  serienBonusMin: 1,
  serienBonusMax: 2.5,
  wellenBonus: 20,
  scoreMultiplier: 1,
};

describe('computeSerienBonus', () => {
  it('returns the minimum bonus at streak 0 (erster Treffer einer neuen Serie)', () => {
    expect(computeSerienBonus(0, BASE_PARAMS)).toBe(1);
  });

  it('grows +0.1 per Treffer in der Serie', () => {
    expect(computeSerienBonus(5, BASE_PARAMS)).toBeCloseTo(1.5);
  });

  it('clamps to the maximum for very long streaks', () => {
    expect(computeSerienBonus(100, BASE_PARAMS)).toBe(2.5);
  });
});

describe('computeHitScore', () => {
  it('multiplies basis_punkte (8) by the streak bonus', () => {
    expect(computeHitScore(0, BASE_PARAMS).eq(8)).toBe(true);
    // Serie 5 -> Bonus 1.5 -> 8 * 1.5 = 12
    expect(computeHitScore(5, BASE_PARAMS).eq(12)).toBe(true);
  });

  it('applies the score multiplier from the Score-Multiplikator upgrade', () => {
    const withMultiplier: ScoreFormulaParams = { ...BASE_PARAMS, scoreMultiplier: 1.2 };
    // 8 * 1 (bonus @ streak 0) * 1.2 = 9.6 -> gerundet 10
    expect(computeHitScore(0, withMultiplier).eq(10)).toBe(true);
  });
});

describe('computeWaveBonus', () => {
  it('equals the wellen_bonus constant (20) without upgrades', () => {
    expect(computeWaveBonus(BASE_PARAMS).eq(20)).toBe(true);
  });

  it('applies the score multiplier', () => {
    expect(computeWaveBonus({ ...BASE_PARAMS, scoreMultiplier: 1.5 }).eq(30)).toBe(true);
  });
});

describe('applyHit / applyWaveCleared', () => {
  it('accumulates score across hits and cleared waves (kein Strafpunkte-Term mehr)', () => {
    let score = new Decimal(0);
    score = applyHit(score, 0, BASE_PARAMS); // +8
    score = applyHit(score, 1, BASE_PARAMS); // Serie 1 -> Bonus 1.1 -> +8.8 -> 9
    score = applyWaveCleared(score, BASE_PARAMS); // +20

    expect(score.eq(37)).toBe(true);
  });
});
