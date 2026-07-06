import { Decimal, ZERO } from '../core/BigNumber';

// Upgrade-Level für Automat 1 (SPECIFICATION.md Abschnitt 4a). Level-Indizes
// sind bewusst `number`, nicht `Decimal` — CLAUDE.md nimmt Level-Indizes
// explizit von der BigNumber-Pflicht aus.
export interface Machine01UpgradeLevels {
  schnellereReflexe: number;
  groessererHammer: number;
  scoreMultiplikator: number;
  verlaengerteRunde: number;
  fehlerverzeihung: number;
}

export function createInitialMachine01Upgrades(): Machine01UpgradeLevels {
  return {
    schnellereReflexe: 0,
    groessererHammer: 0,
    scoreMultiplikator: 0,
    verlaengerteRunde: 0,
    fehlerverzeihung: 0,
  };
}

// Zustand ab Phase 2 (DOCS/IMPLEMENTATION_PLAN.md). Weitere Automaten-
// Ressourcen kommen mit den jeweiligen Automaten hinzu (Phase 5/6).
export interface GameState {
  hallCredits: Decimal;
  reflexPunkte: Decimal; // Automat 1 (Whac-a-Mole), SPECIFICATION.md Abschnitt 3
  lastTickAt: number;
  machine01Upgrades: Machine01UpgradeLevels;
  machine01RunCount: number; // n aus SPECIFICATION.md Abschnitt 4
  machine01TotalScore: Decimal; // Summe aller Run-Scores, Basis für Skill-Durchschnitt
  machine01HasBroken: boolean; // verhindert erneutes Break-Triggern nach Reload
}

export function createInitialGameState(now: number = Date.now()): GameState {
  return {
    hallCredits: ZERO,
    reflexPunkte: ZERO,
    lastTickAt: now,
    machine01Upgrades: createInitialMachine01Upgrades(),
    machine01RunCount: 0,
    machine01TotalScore: ZERO,
    machine01HasBroken: false,
  };
}
