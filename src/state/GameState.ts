import { Decimal, ZERO } from '../core/BigNumber';

// Zustand ab Phase 2 (DOCS/IMPLEMENTATION_PLAN.md). Weitere Automaten-
// Ressourcen kommen mit den jeweiligen Automaten hinzu (Phase 5/6).
export interface GameState {
  hallCredits: Decimal;
  reflexPunkte: Decimal; // Automat 1 (Whac-a-Mole), SPECIFICATION.md Abschnitt 3
  lastTickAt: number;
}

export function createInitialGameState(now: number = Date.now()): GameState {
  return {
    hallCredits: ZERO,
    reflexPunkte: ZERO,
    lastTickAt: now,
  };
}
