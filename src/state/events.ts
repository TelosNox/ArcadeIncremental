import type { Decimal } from '../core/BigNumber';

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

export type GameEvent = TickEvent | HallCreditsAddedEvent | RunCompletedEvent;
