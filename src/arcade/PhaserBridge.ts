import type { GameEvent } from '../state/events';
import type { StateStore } from '../state/StateStore';

// Bridge zwischen Arcade-Ebene und StateStore (CLAUDE.md, Architektur-Regel 1):
// Scenes rufen ausschließlich emit() auf und schreiben nie direkt auf
// GameState. Ein direkter GameState-Zugriff aus einer Scene wäre ein
// Architekturbruch.
export interface ArcadeBridge {
  emit(event: GameEvent): void;
}

export function createArcadeBridge(store: StateStore): ArcadeBridge {
  return {
    emit: (event) => store.emit(event),
  };
}
