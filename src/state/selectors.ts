import type { Decimal } from '../core/BigNumber';
import type { GameState } from './GameState';

export function selectHallCredits(state: GameState): Decimal {
  return state.hallCredits;
}
