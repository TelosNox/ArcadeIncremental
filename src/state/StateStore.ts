import { getUpgradeCost as getMachine01UpgradeCost, getUpgradeMaxLevel as getMachine01UpgradeMaxLevel } from '../arcade/machines/machine01-whackamole/upgrades';
import { getUpgradeCost as getMachine02UpgradeCost, getUpgradeMaxLevel as getMachine02UpgradeMaxLevel } from '../arcade/machines/machine02-shooter/upgrades';
import { computeHallCreditsFromMachineCurrency } from '../hall/HallCredits';
import { getHallUpgradeCost, getHallUpgradeMaxLevel } from '../hall/HallUpgrades';
import { getSupportBoostCost, getSupportBoostMaxLevel } from '../hall/SupportBoosts';
import { canUnlockMachine, getUnlockCost } from '../hall/UnlockLogic';
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
    case 'runCompleted': {
      // Hallen-Credits-Aggregation aus allen aktiven Automaten (Phase 4,
      // SPECIFICATION.md Abschnitt 3/6): ein Anteil jeder gutgeschriebenen
      // Automaten-Ressource fließt zusätzlich in die Meta-Währung, unabhängig
      // von machineId — siehe hall/HallCredits.ts.
      const hallCredits = state.hallCredits.add(
        computeHallCreditsFromMachineCurrency(event.creditsEarned, state.hallUpgrades),
      );
      if (event.machineId === 'machine01-whackamole') {
        return {
          ...state,
          reflexPunkte: state.reflexPunkte.add(event.creditsEarned),
          hallCredits,
          machine01RunCount: state.machine01RunCount + 1,
          machine01TotalScore: state.machine01TotalScore.add(event.score),
        };
      }
      return {
        ...state,
        abschuesse: state.abschuesse.add(event.creditsEarned),
        hallCredits,
      };
    }
    case 'machine01UpgradePurchased': {
      // Reducer ist die verbindliche Prüfinstanz (Level-Limit + Kosten),
      // nicht nur die UI — ein veralteter Klick darf Credits nie ins Minus
      // ziehen (siehe arcade/machines/machine01-whackamole/upgrades.ts).
      const currentLevel = state.machine01Upgrades[event.upgradeId];
      const maxLevel = getMachine01UpgradeMaxLevel(event.upgradeId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getMachine01UpgradeCost(event.upgradeId, currentLevel);
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
    case 'machine02UpgradePurchased': {
      const currentLevel = state.machine02Upgrades[event.upgradeId];
      const maxLevel = getMachine02UpgradeMaxLevel(event.upgradeId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getMachine02UpgradeCost(event.upgradeId, currentLevel);
      if (state.abschuesse.lt(cost)) {
        return state;
      }
      return {
        ...state,
        abschuesse: state.abschuesse.sub(cost),
        machine02Upgrades: {
          ...state.machine02Upgrades,
          [event.upgradeId]: currentLevel + 1,
        },
      };
    }
    case 'machine01BreakTriggered':
      return { ...state, machine01HasBroken: true };
    case 'hallUpgradePurchased': {
      const currentLevel = state.hallUpgrades[event.upgradeId];
      const maxLevel = getHallUpgradeMaxLevel(event.upgradeId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getHallUpgradeCost(event.upgradeId, currentLevel);
      if (state.hallCredits.lt(cost)) {
        return state;
      }
      return {
        ...state,
        hallCredits: state.hallCredits.sub(cost),
        hallUpgrades: {
          ...state.hallUpgrades,
          [event.upgradeId]: currentLevel + 1,
        },
      };
    }
    case 'machine01SupportBoostPurchased': {
      const currentLevel = state.machine01SupportBoosts[event.boostId];
      const maxLevel = getSupportBoostMaxLevel(event.boostId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getSupportBoostCost(event.boostId, currentLevel);
      if (state.hallCredits.lt(cost)) {
        return state;
      }
      return {
        ...state,
        hallCredits: state.hallCredits.sub(cost),
        machine01SupportBoosts: {
          ...state.machine01SupportBoosts,
          [event.boostId]: currentLevel + 1,
        },
      };
    }
    case 'machine02SupportBoostPurchased': {
      const currentLevel = state.machine02SupportBoosts[event.boostId];
      const maxLevel = getSupportBoostMaxLevel(event.boostId);
      if (maxLevel !== undefined && currentLevel >= maxLevel) {
        return state;
      }
      const cost = getSupportBoostCost(event.boostId, currentLevel);
      if (state.hallCredits.lt(cost)) {
        return state;
      }
      return {
        ...state,
        hallCredits: state.hallCredits.sub(cost),
        machine02SupportBoosts: {
          ...state.machine02SupportBoosts,
          [event.boostId]: currentLevel + 1,
        },
      };
    }
    case 'machineUnlocked': {
      if (!canUnlockMachine(state.unlockedMachines, state.hallCredits, event.machineNumber, state.hallUpgrades)) {
        return state;
      }
      const cost = getUnlockCost(event.machineNumber, state.hallUpgrades);
      return {
        ...state,
        hallCredits: state.hallCredits.sub(cost),
        unlockedMachines: [...state.unlockedMachines, event.machineNumber].sort((a, b) => a - b),
      };
    }
    default: {
      const exhaustiveCheck: never = event;
      throw new Error(`Unbekannter Event-Typ: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
