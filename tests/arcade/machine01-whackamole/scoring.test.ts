import { describe, expect, it } from 'vitest';
import { Decimal } from '../../../src/core/BigNumber';
import {
  applyHit,
  applyMiss,
  computeHitScore,
  computeMissPenalty,
  computeZeitBonus,
} from '../../../src/arcade/machines/machine01-whackamole/scoring';

describe('computeZeitBonus', () => {
  it('returns the maximum bonus for an instant reaction', () => {
    expect(computeZeitBonus(0)).toBe(2);
  });

  it('returns 1 at the reference reaction time of 500ms', () => {
    expect(computeZeitBonus(500)).toBe(1);
  });

  it('clamps to the minimum for slow reactions', () => {
    expect(computeZeitBonus(10_000)).toBe(0.5);
  });

  it('clamps to the maximum for negative/implausible reaction times', () => {
    expect(computeZeitBonus(-100)).toBe(2);
  });
});

describe('computeHitScore', () => {
  it('multiplies basis_punkte (10) by the time bonus', () => {
    expect(computeHitScore(500).eq(10)).toBe(true);
    expect(computeHitScore(0).eq(20)).toBe(true);
    expect(computeHitScore(10_000).eq(5)).toBe(true);
  });

  it('rounds to a whole number when the time bonus is fractional', () => {
    // zeit_bonus(137) = 2 - 137/500 = 1.726 -> 10 * 1.726 = 17.26 -> 17
    expect(computeHitScore(137).eq(17)).toBe(true);
  });
});

describe('computeMissPenalty', () => {
  it('equals the strafe constant (5)', () => {
    expect(computeMissPenalty().eq(5)).toBe(true);
  });
});

describe('applyHit / applyMiss', () => {
  it('accumulates score across hits and misses (Abschnitt 4a Formel)', () => {
    let score = new Decimal(0);
    score = applyHit(score, 500); // +10
    score = applyHit(score, 0); // +20
    score = applyMiss(score); // -5

    expect(score.eq(25)).toBe(true);
  });

  it('allows the score to go negative when misses dominate', () => {
    let score = new Decimal(0);
    score = applyMiss(score);
    score = applyMiss(score);

    expect(score.eq(-10)).toBe(true);
  });
});
