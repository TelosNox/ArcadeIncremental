import { describe, expect, it } from 'vitest';
import {
  computeEffectiveParams,
  getUpgradeCost,
  getUpgradeMaxLevel,
} from '../../../src/arcade/machines/machine02-shooter/upgrades';
import { createInitialMachine02Upgrades, createInitialSupportBoosts } from '../../../src/state/GameState';
import {
  BASIS_PUNKTE,
  CANNON_COOLDOWN_MS,
  HIT_RADIUS_PX,
  START_LEBEN,
} from '../../../src/arcade/machines/machine02-shooter/config';

describe('getUpgradeCost', () => {
  it('matches the agreed cost formulas at level 0', () => {
    expect(getUpgradeCost('schnellfeuer', 0).eq(10)).toBe(true);
    expect(getUpgradeCost('breiterKanonenkopf', 0).eq(15)).toBe(true);
    expect(getUpgradeCost('scoreMultiplikator', 0).eq(20)).toBe(true);
    expect(getUpgradeCost('verstaerkterRumpf', 0).eq(25)).toBe(true);
  });
});

describe('getUpgradeMaxLevel', () => {
  it('caps "Verstärkter Rumpf" at 3', () => {
    expect(getUpgradeMaxLevel('verstaerkterRumpf')).toBe(3);
  });

  it('leaves the other upgrades uncapped', () => {
    expect(getUpgradeMaxLevel('schnellfeuer')).toBeUndefined();
    expect(getUpgradeMaxLevel('breiterKanonenkopf')).toBeUndefined();
    expect(getUpgradeMaxLevel('scoreMultiplikator')).toBeUndefined();
  });
});

describe('computeEffectiveParams', () => {
  it('matches the base config values when no upgrades or support boosts are owned', () => {
    const params = computeEffectiveParams(createInitialMachine02Upgrades(), createInitialSupportBoosts());

    expect(params.basisPunkte).toBe(BASIS_PUNKTE);
    expect(params.scoreMultiplier).toBe(1);
    expect(params.cannonCooldownMs).toBe(CANNON_COOLDOWN_MS);
    expect(params.hitRadiusPx).toBe(HIT_RADIUS_PX);
    expect(params.startLeben).toBe(START_LEBEN);
    expect(params.startScore).toBe(0);
  });

  it('reduces the cannon cooldown per Schnellfeuer level but floors it', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine02Upgrades(), schnellfeuer: 50 },
      createInitialSupportBoosts(),
    );
    expect(params.cannonCooldownMs).toBe(100);
  });

  it('widens the hit radius per Breiterer-Kanonenkopf level', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine02Upgrades(), breiterKanonenkopf: 3 },
      createInitialSupportBoosts(),
    );
    expect(params.hitRadiusPx).toBe(HIT_RADIUS_PX + 12);
  });

  it('adds +10% score multiplier per Score-Multiplikator level', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine02Upgrades(), scoreMultiplikator: 2 },
      createInitialSupportBoosts(),
    );
    expect(params.scoreMultiplier).toBeCloseTo(1.2);
  });

  it('adds +1 Leben per Verstärkter-Rumpf level', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine02Upgrades(), verstaerkterRumpf: 3 },
      createInitialSupportBoosts(),
    );
    expect(params.startLeben).toBe(START_LEBEN + 3);
  });

  it('adds the Trainer support-boost bonus on top of the local score multiplier', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine02Upgrades(), scoreMultiplikator: 1 },
      { ...createInitialSupportBoosts(), trainer: 2 },
    );
    // 1 + 1*0.1 (Upgrade) + 2*0.05 (Trainer) = 1.2
    expect(params.scoreMultiplier).toBeCloseTo(1.2);
  });

  it('adds extra lives from the Slow-Motion-Charge/Extra-Leben boost directly', () => {
    const params = computeEffectiveParams(createInitialMachine02Upgrades(), {
      ...createInitialSupportBoosts(),
      slowMotion: 2,
    });
    expect(params.startLeben).toBe(START_LEBEN + 2);
  });

  it('exposes startScore from the Kopfstart boost', () => {
    const params = computeEffectiveParams(createInitialMachine02Upgrades(), {
      ...createInitialSupportBoosts(),
      kopfstart: 4,
    });
    expect(params.startScore).toBe(20);
  });
});
