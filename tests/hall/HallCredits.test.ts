import { describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { computeHallCreditsFromMachineCurrency } from '../../src/hall/HallCredits';
import { createInitialHallUpgrades } from '../../src/state/GameState';

describe('computeHallCreditsFromMachineCurrency', () => {
  it('takes a 20% share of the machine currency earned by default', () => {
    const result = computeHallCreditsFromMachineCurrency(new Decimal(50), createInitialHallUpgrades());
    expect(result.eq(10)).toBe(true);
  });

  it('floors the result and never goes negative', () => {
    const result = computeHallCreditsFromMachineCurrency(new Decimal(7), createInitialHallUpgrades());
    // 7 * 0.2 = 1.4 -> floor 1
    expect(result.eq(1)).toBe(true);
  });

  it('scales with the Hallen-Sammler upgrade', () => {
    const upgrades = { ...createInitialHallUpgrades(), hallenSammler: 1 };
    // 50 * 0.2 * 1.1 = 11
    const result = computeHallCreditsFromMachineCurrency(new Decimal(50), upgrades);
    expect(result.eq(11)).toBe(true);
  });
});
