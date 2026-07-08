import type { Decimal } from '../core/BigNumber';
import type { HallUpgradeLevels, Machine01UpgradeLevels, Machine02UpgradeLevels, SupportBoostLevels } from './GameState';

// Typisierte Events für die Kommunikation zwischen Idle-Kern, Arcade-Ebene und
// Hallen-Layer über den StateStore — direkte Zugriffe zwischen den Ebenen sind
// ein Architekturbruch (CLAUDE.md, Architektur-Regel 1).
export interface TickEvent {
  type: 'tick';
  deltaMs: number;
  timestamp: number;
}

export interface HallCreditsAddedEvent {
  type: 'hallCreditsAdded';
  amount: Decimal;
}

// Meldung eines abgeschlossenen Arcade-Runs (SPECIFICATION.md Abschnitt 3):
// Score wird bereits umgerechnet als creditsEarned mitgeschickt, damit der
// Store nur noch die Automaten-Ressource fortschreiben muss. machineId ist
// bewusst ein einzelnes Literal statt eines generischen `string` — der
// Reducer bekommt pro Automat einen eigenen `case`, kein Fallback für
// unbekannte IDs nötig.
export interface RunCompletedEvent {
  type: 'runCompleted';
  machineId: 'machine01-whackamole' | 'machine02-shooter';
  score: Decimal;
  creditsEarned: Decimal;
}

// Kauf eines Automat-1-Upgrades (SPECIFICATION.md Abschnitt 4a). Kosten
// werden NICHT mitgeschickt — der Reducer ist die verbindliche Prüfinstanz
// (Kosten + Level-Limit gegen den aktuellen Zustand), nicht die UI, damit ein
// veralteter Klick nie Credits ins Minus zieht.
export interface Machine01UpgradePurchasedEvent {
  type: 'machine01UpgradePurchased';
  upgradeId: keyof Machine01UpgradeLevels;
}

// Kauf eines Automat-2-Upgrades (SPECIFICATION.md Abschnitt 7, Phase 5) —
// analog zu Machine01UpgradePurchasedEvent, siehe dortigen Kommentar.
export interface Machine02UpgradePurchasedEvent {
  type: 'machine02UpgradePurchased';
  upgradeId: keyof Machine02UpgradeLevels;
}

// Einmaliges Break-Ereignis (SPECIFICATION.md Abschnitt 1/4) — setzt
// machine01HasBroken, damit der Blind/Reveal-Twist nie erneut auslöst.
export interface Machine01BreakTriggeredEvent {
  type: 'machine01BreakTriggered';
}

// Kauf eines Hallen-weiten Upgrades (SPECIFICATION.md Abschnitt 6, Phase 4).
// Kosten werden wie bei Machine01UpgradePurchasedEvent NICHT mitgeschickt —
// der Reducer prüft Kosten/Level-Limit gegen den aktuellen Zustand.
export interface HallUpgradePurchasedEvent {
  type: 'hallUpgradePurchased';
  upgradeId: keyof HallUpgradeLevels;
}

// Kauf eines Support-Boosts (SPECIFICATION.md Abschnitt 6, Phase 4/5) für
// Automat 1. Seit Phase 5 (HallScene) führt jeder Automat sein eigenes
// Boost-Set, daher ein eigenes Event pro Automat statt eines gemeinsamen
// "aktueller Automat"-Zustands.
export interface Machine01SupportBoostPurchasedEvent {
  type: 'machine01SupportBoostPurchased';
  boostId: keyof SupportBoostLevels;
}

// Kauf eines Support-Boosts für Automat 2 — analog zu
// Machine01SupportBoostPurchasedEvent.
export interface Machine02SupportBoostPurchasedEvent {
  type: 'machine02SupportBoostPurchased';
  boostId: keyof SupportBoostLevels;
}

// Freischaltung eines neuen Automaten (SPECIFICATION.md Abschnitt 6, Phase 4).
// machineNumber ist die 1-basierte Automaten-Nummer aus Abschnitt 7 (2..8) —
// der Reducer prüft Reihenfolge/Kosten gegen den aktuellen Zustand, siehe
// hall/UnlockLogic.ts.
export interface MachineUnlockedEvent {
  type: 'machineUnlocked';
  machineNumber: number;
}

export type GameEvent =
  | TickEvent
  | HallCreditsAddedEvent
  | RunCompletedEvent
  | Machine01UpgradePurchasedEvent
  | Machine02UpgradePurchasedEvent
  | Machine01BreakTriggeredEvent
  | HallUpgradePurchasedEvent
  | Machine01SupportBoostPurchasedEvent
  | Machine02SupportBoostPurchasedEvent
  | MachineUnlockedEvent;
