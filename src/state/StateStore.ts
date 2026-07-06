import { getUpgradeCost, getUpgradeMaxLevel } from '../arcade/machines/machine01-whackamole/upgrades';
import type { GameState } from './GameState';
import type { GameEvent } from './events';

export type StateListener = (state: Readonly<GameState>) => void;

// Zentraler Pub/Sub-Store (CLAUDE.md, Architektur-Regel 1): Idle-Kern und
// Arcade-Ebene kommunizieren ausschließlich über emit()/subscribe(), nie
// direkt miteinander.
export class StateStore {
  private state: GameState;
  private readonly listeners = new Set<StateListener>();

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: GameEvent): void {
    this.state = reduce(this.state, event);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

function reduce(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'tick':
      return { ...state, lastTickAt: event.timestamp };
    case 'hallCreditsAdded':
      return { ...state, hallCredits: state.hallCredits.add(event.amount) };
    case 'runCompleted':
      return {
        ...state,
        reflexPunkte: state.reflexPunkte.add(event.creditsEarned),
        machine01RunCount: state.machine01RunCount + 1,
        machine01TotalScore: state.machine01TotalScore.add(event.score),
      };
    case 'machine01UpgradePurchased': {
      // Reducer ist die verbindliche Prüfinstanz (Level-Limit + Kosten),
      // nicht nur die UI — ein veralteter Klick darf Credits nie ins Minus
      // ziehen (siehe arcade/machines/machine01-whackamole/upgrades.ts).
      const currentLevel = state.machine01Upgrades[event.upgradeId];
      const maxLevel = getUpgradeMaxLevel(event.upgradeId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getUpgradeCost(event.upgradeId, currentLevel);
      if (state.reflexPunkte.lt(cost)) {
        return state;
      }
      return {
        ...state,
        reflexPunkte: state.reflexPunkte.sub(cost),
        machine01Upgrades: {
          ...state.machine01Upgrades,
          [event.upgradeId]: currentLevel + 1,
        },
      };
    }
    case 'machine01BreakTriggered':
      return { ...state, machine01HasBroken: true };
    default: {
      const exhaustiveCheck: never = event;
      throw new Error(`Unbekannter Event-Typ: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
