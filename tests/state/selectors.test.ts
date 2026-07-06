import { describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { createInitialGameState } from '../../src/state/GameState';
import { selectHallCredits } from '../../src/state/selectors';

describe('selectHallCredits', () => {
  it('returns the hallCredits field of the given state', () => {
    const state = { ...createInitialGameState(0), hallCredits: new Decimal(7) };

    expect(selectHallCredits(state).eq(7)).toBe(true);
  });
});
