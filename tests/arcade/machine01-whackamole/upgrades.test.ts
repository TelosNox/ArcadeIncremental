import { describe, expect, it } from 'vitest';
import {
  computeEffectiveParams,
  getUpgradeCost,
  getUpgradeMaxLevel,
} from '../../../src/arcade/machines/machine01-whackamole/upgrades';
import { createInitialSupportBoosts, createInitialMachine01Upgrades } from '../../../src/state/GameState';
import {
  BASIS_PUNKTE,
  MOLE_VISIBLE_DURATION_MS,
  RUN_DURATION_MS,
  SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL,
  ZEIT_BONUS_MAX,
  ZEIT_BONUS_MIN,
  ZEIT_BONUS_REFERENCE_MS,
} from '../../../src/arcade/machines/machine01-whackamole/config';

describe('getUpgradeCost', () => {
  it('matches the exact cost formulas from SPECIFICATION.md Abschnitt 4a at level 0', () => {
    expect(getUpgradeCost('schnellereReflexe', 0).eq(10)).toBe(true);
    expect(getUpgradeCost('groessererHammer', 0).eq(15)).toBe(true);
    expect(getUpgradeCost('scoreMultiplikator', 0).eq(20)).toBe(true);
    expect(getUpgradeCost('verlaengerteRunde', 0).eq(25)).toBe(true);
  });

  it('grows exponentially with basis × wachstum^level', () => {
    // 10 * 1.15^3 = 15.209... -> gerundet 15
    expect(getUpgradeCost('schnellereReflexe', 3).eq(15)).toBe(true);
  });
});

describe('getUpgradeMaxLevel', () => {
  it('caps "Verlängerte Runde" at 3 (exakt, Abschnitt 4a)', () => {
    expect(getUpgradeMaxLevel('verlaengerteRunde')).toBe(3);
  });

  it('leaves the other upgrades uncapped', () => {
    expect(getUpgradeMaxLevel('schnellereReflexe')).toBeUndefined();
    expect(getUpgradeMaxLevel('groessererHammer')).toBeUndefined();
    expect(getUpgradeMaxLevel('scoreMultiplikator')).toBeUndefined();
  });
});

describe('computeEffectiveParams', () => {
  it('matches the base config values when no upgrades or support boosts are owned', () => {
    const params = computeEffectiveParams(createInitialMachine01Upgrades(), createInitialSupportBoosts());

    expect(params.basisPunkte).toBe(BASIS_PUNKTE);
    expect(params.zeitBonusReferenceMs).toBe(ZEIT_BONUS_REFERENCE_MS);
    expect(params.zeitBonusMin).toBe(ZEIT_BONUS_MIN);
    expect(params.zeitBonusMax).toBe(ZEIT_BONUS_MAX);
    expect(params.scoreMultiplier).toBe(1);
    expect(params.hitRadiusBonusPx).toBe(0);
    expect(params.runDurationMs).toBe(RUN_DURATION_MS);
    expect(params.moleVisibleDurationMs).toBe(MOLE_VISIBLE_DURATION_MS);
    expect(params.startScore).toBe(0);
  });

  it('widens the zeit_bonus reference time per Schnellere-Reflexe level', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine01Upgrades(), schnellereReflexe: 2 },
      createInitialSupportBoosts(),
    );
    expect(params.zeitBonusReferenceMs).toBe(ZEIT_BONUS_REFERENCE_MS + 100);
  });

  it('adds a hit-radius bonus per Größerer-Hammer level', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine01Upgrades(), groessererHammer: 3 },
      createInitialSupportBoosts(),
    );
    expect(params.hitRadiusBonusPx).toBe(24);
  });

  it('adds +10% score multiplier per Score-Multiplikator level (exakt, Abschnitt 4a)', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine01Upgrades(), scoreMultiplikator: 2 },
      createInitialSupportBoosts(),
    );
    expect(params.scoreMultiplier).toBeCloseTo(1.2);
  });

  it('adds +5s run duration per Verlängerte-Runde level (exakt, Abschnitt 4a)', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine01Upgrades(), verlaengerteRunde: 3 },
      createInitialSupportBoosts(),
    );
    expect(params.runDurationMs).toBe(RUN_DURATION_MS + 15_000);
  });

  it('adds the Trainer support-boost bonus on top of the local score multiplier', () => {
    const params = computeEffectiveParams(
      { ...createInitialMachine01Upgrades(), scoreMultiplikator: 1 },
      { ...createInitialSupportBoosts(), trainer: 2 },
    );
    // 1 + 1*0.1 (Upgrade) + 2*0.05 (Trainer) = 1.2
    expect(params.scoreMultiplier).toBeCloseTo(1.2);
  });

  it('extends mole visible duration per Slow-Motion-Charge/Extra-Leben boost level', () => {
    const params = computeEffectiveParams(createInitialMachine01Upgrades(), {
      ...createInitialSupportBoosts(),
      slowMotion: 3,
    });
    expect(params.moleVisibleDurationMs).toBe(MOLE_VISIBLE_DURATION_MS + 3 * SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL);
  });

  it('exposes startScore from the Kopfstart boost', () => {
    const params = computeEffectiveParams(createInitialMachine01Upgrades(), {
      ...createInitialSupportBoosts(),
      kopfstart: 4,
    });
    expect(params.startScore).toBe(20);
  });
});
