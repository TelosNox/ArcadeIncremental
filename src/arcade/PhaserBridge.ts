import type { GameState } from '../state/GameState';
import type { GameEvent } from '../state/events';
import type { StateListener, StateStore } from '../state/StateStore';

// Bridge zwischen Arcade-Ebene und StateStore (CLAUDE.md, Architektur-Regel 1):
// Scenes schreiben nie direkt auf GameState, sondern ausschließlich über
// emit(). Lesen ist erlaubt (die Scene braucht z. B. aktuelle Upgrade-Level,
// um effektive Spielparameter abzuleiten), läuft aber ebenfalls explizit
// über die Bridge statt über einen direkten Store-Verweis.
export interface ArcadeBridge {
  emit(event: GameEvent): void;
  getState(): Readonly<GameState>;
  subscribe(listener: StateListener): () => void;
}

export function createArcadeBridge(store: StateStore): ArcadeBridge {
  return {
    emit: (event) => store.emit(event),
    getState: () => store.getState(),
    subscribe: (listener) => store.subscribe(listener),
  };
}
