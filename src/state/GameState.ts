import { Decimal, ZERO } from '../core/BigNumber';

// Upgrade-Level für Automat 1 (SPECIFICATION.md Abschnitt 4a). Level-Indizes
// sind bewusst `number`, nicht `Decimal` — CLAUDE.md nimmt Level-Indizes
// explizit von der BigNumber-Pflicht aus.
// "fehlerverzeihung" (reduzierte Strafe pro verpasster Mole) ist entfallen,
// seit Strafpunkte komplett aus allen Automaten entfernt wurden (mit dem
// Nutzer abgestimmt: Strafpunkte wirken kontraproduktiv aufs Spielerlebnis).
export interface Machine01UpgradeLevels {
  schnellereReflexe: number;
  groessererHammer: number;
  scoreMultiplikator: number;
  verlaengerteRunde: number;
}

export function createInitialMachine01Upgrades(): Machine01UpgradeLevels {
  return {
    schnellereReflexe: 0,
    groessererHammer: 0,
    scoreMultiplikator: 0,
    verlaengerteRunde: 0,
  };
}

// Upgrade-Level für Automat 2 (SPECIFICATION.md Abschnitt 7, Balance-Werte
// aus DOCS/IMPLEMENTATION_PLAN.md Phase 5 mit dem Nutzer abgestimmt) —
// bewusst symmetrisch zu Machine01UpgradeLevels aufgebaut (3 Gameplay- +
// 1 abstraktes Score-Upgrade), nur genrepassend umbenannt. "zielcomputer"
// (reduzierte Fehlschuss-Strafe) ist aus demselben Grund entfallen wie
// "fehlerverzeihung" oben.
export interface Machine02UpgradeLevels {
  schnellfeuer: number;
  breiterKanonenkopf: number;
  scoreMultiplikator: number;
  verstaerkterRumpf: number;
}

export function createInitialMachine02Upgrades(): Machine02UpgradeLevels {
  return {
    schnellfeuer: 0,
    breiterKanonenkopf: 0,
    scoreMultiplikator: 0,
    verstaerkterRumpf: 0,
  };
}

// Hallen-weite Upgrades (Phase 4, SPECIFICATION.md Abschnitt 6, siehe
// hall/HallUpgrades.ts für Kosten/Effekt-Formeln).
export interface HallUpgradeLevels {
  hallenSammler: number;
  automatenRabatt: number;
}

export function createInitialHallUpgrades(): HallUpgradeLevels {
  return {
    hallenSammler: 0,
    automatenRabatt: 0,
  };
}

// Support-Boosts für einen aktiv gespielten Automaten (Phase 4/5,
// SPECIFICATION.md Abschnitt 6, siehe hall/SupportBoosts.ts). Generisch statt
// pro Automat dupliziert: seit Phase 5 (HallScene) führt jeder Automat sein
// eigenes Boost-Level-Set — es gibt keinen gemeinsamen Topf mehr, für den ein
// "aktuell aktiver Automat"-Flag nötig wäre.
export interface SupportBoostLevels {
  trainer: number;
  slowMotion: number;
  kopfstart: number;
}

export function createInitialSupportBoosts(): SupportBoostLevels {
  return {
    trainer: 0,
    slowMotion: 0,
    kopfstart: 0,
  };
}

// Zustand ab Phase 2 (DOCS/IMPLEMENTATION_PLAN.md). Weitere Automaten-
// Ressourcen kommen mit den jeweiligen Automaten hinzu (Phase 5/6).
export interface GameState {
  hallCredits: Decimal;
  reflexPunkte: Decimal; // Automat 1 (Whac-a-Mole), SPECIFICATION.md Abschnitt 3
  abschuesse: Decimal; // Automat 2 (Shooter), SPECIFICATION.md Abschnitt 7
  lastTickAt: number;
  machine01Upgrades: Machine01UpgradeLevels;
  machine01RunCount: number; // n aus SPECIFICATION.md Abschnitt 4
  machine01TotalScore: Decimal; // Summe aller Run-Scores, Basis für Skill-Durchschnitt
  machine01HasBroken: boolean; // verhindert erneutes Break-Triggern nach Reload
  machine02Upgrades: Machine02UpgradeLevels;
  unlockedMachines: number[]; // Automat 1 ist immer freigeschaltet (Phase 4)
  hallUpgrades: HallUpgradeLevels;
  machine01SupportBoosts: SupportBoostLevels;
  machine02SupportBoosts: SupportBoostLevels;
}

export function createInitialGameState(now: number = Date.now()): GameState {
  return {
    hallCredits: ZERO,
    reflexPunkte: ZERO,
    abschuesse: ZERO,
    lastTickAt: now,
    machine01Upgrades: createInitialMachine01Upgrades(),
    machine01RunCount: 0,
    machine01TotalScore: ZERO,
    machine01HasBroken: false,
    machine02Upgrades: createInitialMachine02Upgrades(),
    unlockedMachines: [1],
    hallUpgrades: createInitialHallUpgrades(),
    machine01SupportBoosts: createInitialSupportBoosts(),
    machine02SupportBoosts: createInitialSupportBoosts(),
  };
}
