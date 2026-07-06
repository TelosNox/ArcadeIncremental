import { Decimal, ZERO } from '../core/BigNumber';

// Fundament-Zustand für Phase 1 (DOCS/IMPLEMENTATION_PLAN.md). Automaten-
// spezifischer Zustand (Ressourcen, Upgrades pro Automat) kommt ab Phase 2
// hinzu, sobald der erste Automat existiert.
export interface GameState {
  hallCredits: Decimal;
  lastTickAt: number;
}

export function createInitialGameState(now: number = Date.now()): GameState {
  return {
    hallCredits: ZERO,
    lastTickAt: now,
  };
}
