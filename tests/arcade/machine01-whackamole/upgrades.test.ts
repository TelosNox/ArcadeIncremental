import { describe, expect, it } from 'vitest';
import {
  computeEffectiveParams,
  getUpgradeCost,
  getUpgradeMaxLevel,
} from '../../../src/arcade/machines/machine01-whackamole/upgrades';
import { createInitialMachine01Upgrades } from '../../../src/state/GameState';
import {
  BASIS_PUNKTE,
  RUN_DURATION_MS,
  STRAFE,
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
    expect(getUpgradeCost('fehlerverzeihung', 0).eq(12)).toBe(true);
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
    expect(getUpgradeMaxLevel('fehlerverzeihung')).toBeUndefined();
  });
});

describe('computeEffectiveParams', () => {
  it('matches the base config values when no upgrades are owned', () => {
    const params = computeEffectiveParams(createInitialMachine01Upgrades());

    expect(params.basisPunkte).toBe(BASIS_PUNKTE);
    expect(params.strafe).toBe(STRAFE);
    expect(params.zeitBonusReferenceMs).toBe(ZEIT_BONUS_REFERENCE_MS);
    expect(params.zeitBonusMin).toBe(ZEIT_BONUS_MIN);
    expect(params.zeitBonusMax).toBe(ZEIT_BONUS_MAX);
    expect(params.scoreMultiplier).toBe(1);
    expect(params.hitRadiusBonusPx).toBe(0);
    expect(params.runDurationMs).toBe(RUN_DURATION_MS);
  });

  it('widens the zeit_bonus reference time per Schnellere-Reflexe level', () => {
    const params = computeEffectiveParams({ ...createInitialMachine01Upgrades(), schnellereReflexe: 2 });
    expect(params.zeitBonusReferenceMs).toBe(ZEIT_BONUS_REFERENCE_MS + 100);
  });

  it('adds a hit-radius bonus per Größerer-Hammer level', () => {
    const params = computeEffectiveParams({ ...createInitialMachine01Upgrades(), groessererHammer: 3 });
    expect(params.hitRadiusBonusPx).toBe(24);
  });

  it('adds +10% score multiplier per Score-Multiplikator level (exakt, Abschnitt 4a)', () => {
    const params = computeEffectiveParams({ ...createInitialMachine01Upgrades(), scoreMultiplikator: 2 });
    expect(params.scoreMultiplier).toBeCloseTo(1.2);
  });

  it('adds +5s run duration per Verlängerte-Runde level (exakt, Abschnitt 4a)', () => {
    const params = computeEffectiveParams({ ...createInitialMachine01Upgrades(), verlaengerteRunde: 3 });
    expect(params.runDurationMs).toBe(RUN_DURATION_MS + 15_000);
  });

  it('reduces strafe per Fehlerverzeihung level but floors it at 1', () => {
    const params = computeEffectiveParams({ ...createInitialMachine01Upgrades(), fehlerverzeihung: 10 });
    expect(params.strafe).toBe(1);
  });
});
