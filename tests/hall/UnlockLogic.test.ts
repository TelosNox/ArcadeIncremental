import { describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { createInitialHallUpgrades } from '../../src/state/GameState';
import { canUnlockMachine, getNextLockedMachine, getUnlockCost, isMachineUnlocked } from '../../src/hall/UnlockLogic';

describe('getUnlockCost', () => {
  it('matches the exact Freischaltkosten-Formel from SPECIFICATION.md Abschnitt 6', () => {
    const noUpgrades = createInitialHallUpgrades();
    expect(getUnlockCost(2, noUpgrades).eq(150)).toBe(true);
    expect(getUnlockCost(3, noUpgrades).eq(450)).toBe(true);
    expect(getUnlockCost(4, noUpgrades).eq(1350)).toBe(true);
    expect(getUnlockCost(8, noUpgrades).eq(109_350)).toBe(true);
  });

  it('applies the Automaten-Rabatt discount from HallUpgrades', () => {
    const discounted = { ...createInitialHallUpgrades(), automatenRabatt: 2 };
    // 150 * (1 - 2*0.05) = 150 * 0.9 = 135
    expect(getUnlockCost(2, discounted).eq(135)).toBe(true);
  });
});

describe('isMachineUnlocked', () => {
  it('reports machine 1 as unlocked by default', () => {
    expect(isMachineUnlocked([1], 1)).toBe(true);
    expect(isMachineUnlocked([1], 2)).toBe(false);
  });
});

describe('canUnlockMachine', () => {
  it('requires the previous machine to already be unlocked', () => {
    const noUpgrades = createInitialHallUpgrades();
    expect(canUnlockMachine([1], new Decimal(1_000_000), 3, noUpgrades)).toBe(false);
  });

  it('requires enough hallCredits', () => {
    const noUpgrades = createInitialHallUpgrades();
    expect(canUnlockMachine([1], new Decimal(100), 2, noUpgrades)).toBe(false);
    expect(canUnlockMachine([1], new Decimal(150), 2, noUpgrades)).toBe(true);
  });

  it('refuses to unlock an already-unlocked machine', () => {
    const noUpgrades = createInitialHallUpgrades();
    expect(canUnlockMachine([1, 2], new Decimal(1_000_000), 2, noUpgrades)).toBe(false);
  });
});

describe('getNextLockedMachine', () => {
  it('returns the next machine in sequence', () => {
    expect(getNextLockedMachine([1])).toBe(2);
    expect(getNextLockedMachine([1, 2, 3])).toBe(4);
  });

  it('returns undefined once all machines are unlocked', () => {
    expect(getNextLockedMachine([1, 2, 3, 4, 5, 6, 7, 8])).toBeUndefined();
  });
});
