import { describe, expect, it } from 'vitest';
import { createInitialSupportBoosts } from '../../src/state/GameState';
import {
  computeKopfstartBaseScore,
  computeTrainerScoreBonus,
  getSupportBoostCost,
  getSupportBoostMaxLevel,
} from '../../src/hall/SupportBoosts';

describe('getSupportBoostCost', () => {
  it('matches the configured basis cost at level 0', () => {
    expect(getSupportBoostCost('trainer', 0).eq(30)).toBe(true);
    expect(getSupportBoostCost('slowMotion', 0).eq(40)).toBe(true);
    expect(getSupportBoostCost('kopfstart', 0).eq(35)).toBe(true);
  });
});

describe('getSupportBoostMaxLevel', () => {
  it('caps slowMotion and kopfstart, leaves trainer uncapped', () => {
    expect(getSupportBoostMaxLevel('slowMotion')).toBe(5);
    expect(getSupportBoostMaxLevel('kopfstart')).toBe(10);
    expect(getSupportBoostMaxLevel('trainer')).toBeUndefined();
  });
});

describe('effect computations', () => {
  it('computeTrainerScoreBonus grows +5% per level', () => {
    const boosts = { ...createInitialSupportBoosts(), trainer: 3 };
    expect(computeTrainerScoreBonus(boosts)).toBeCloseTo(0.15);
  });

  it('computeKopfstartBaseScore grows +5 per level', () => {
    const boosts = { ...createInitialSupportBoosts(), kopfstart: 4 };
    expect(computeKopfstartBaseScore(boosts)).toBe(20);
  });
});
