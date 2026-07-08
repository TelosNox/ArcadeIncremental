import { describe, expect, it } from 'vitest';
import { createInitialHallUpgrades } from '../../src/state/GameState';
import {
  computeHallCreditsShareMultiplier,
  computeUnlockCostMultiplier,
  getHallUpgradeCost,
  getHallUpgradeMaxLevel,
} from '../../src/hall/HallUpgrades';

describe('getHallUpgradeCost', () => {
  it('matches the configured basis cost at level 0', () => {
    expect(getHallUpgradeCost('hallenSammler', 0).eq(100)).toBe(true);
    expect(getHallUpgradeCost('automatenRabatt', 0).eq(150)).toBe(true);
  });
});

describe('getHallUpgradeMaxLevel', () => {
  it('caps Automaten-Rabatt where the discount floor is reached', () => {
    expect(getHallUpgradeMaxLevel('automatenRabatt')).toBe(10);
  });

  it('leaves Hallen-Sammler uncapped', () => {
    expect(getHallUpgradeMaxLevel('hallenSammler')).toBeUndefined();
  });
});

describe('computeHallCreditsShareMultiplier', () => {
  it('is 1 at level 0 and grows +10% per level', () => {
    expect(computeHallCreditsShareMultiplier(createInitialHallUpgrades())).toBe(1);
    expect(computeHallCreditsShareMultiplier({ ...createInitialHallUpgrades(), hallenSammler: 2 })).toBeCloseTo(1.2);
  });
});

describe('computeUnlockCostMultiplier', () => {
  it('is 1 at level 0 and shrinks -5% per level', () => {
    expect(computeUnlockCostMultiplier(createInitialHallUpgrades())).toBe(1);
    expect(computeUnlockCostMultiplier({ ...createInitialHallUpgrades(), automatenRabatt: 2 })).toBeCloseTo(0.9);
  });

  it('floors at 0.5 even past the nominal max level', () => {
    expect(computeUnlockCostMultiplier({ ...createInitialHallUpgrades(), automatenRabatt: 20 })).toBe(0.5);
  });
});
