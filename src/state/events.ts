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

export type GameEvent = TickEvent | HallCreditsAddedEvent;
