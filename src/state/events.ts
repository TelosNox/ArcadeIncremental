import type { Decimal } from '../core/BigNumber';
import type { Machine01UpgradeLevels } from './GameState';

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
// bewusst ein einzelnes Literal statt eines generischen `string` — sobald
// Automat 2 hinzukommt (Phase 5), erweitert sich die Union und der Reducer
// bekommt einen weiteren `case`, kein Fallback für unbekannte IDs nötig.
export interface RunCompletedEvent {
  type: 'runCompleted';
  machineId: 'machine01-whackamole';
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

// Einmaliges Break-Ereignis (SPECIFICATION.md Abschnitt 1/4) — setzt
// machine01HasBroken, damit der Blind/Reveal-Twist nie erneut auslöst.
export interface Machine01BreakTriggeredEvent {
  type: 'machine01BreakTriggered';
}

export type GameEvent =
  | TickEvent
  | HallCreditsAddedEvent
  | RunCompletedEvent
  | Machine01UpgradePurchasedEvent
  | Machine01BreakTriggeredEvent;
