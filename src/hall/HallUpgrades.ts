import { Decimal } from '../core/BigNumber';
import type { HallUpgradeLevels } from '../state/GameState';
import {
  AUTOMATEN_RABATT_COST_BASIS,
  AUTOMATEN_RABATT_COST_WACHSTUM,
  AUTOMATEN_RABATT_MAX_LEVEL,
  AUTOMATEN_RABATT_MIN_MULTIPLIKATOR,
  AUTOMATEN_RABATT_REDUKTION_PRO_LEVEL,
  HALLEN_SAMMLER_COST_BASIS,
  HALLEN_SAMMLER_COST_WACHSTUM,
  HALLEN_SAMMLER_SHARE_BONUS_PER_LEVEL,
} from '../config/balance';

// Hallen-weite Upgrades (SPECIFICATION.md Abschnitt 6), finanziert aus
// Hallen-Credits statt aus einer Automaten-Ressource. Anders als
// machine01-Upgrades wirken sie nicht auf einen einzelnen Automaten, sondern
// auf Hallen-Mechaniken selbst (Aggregations-Anteil, Freischaltkosten) —
// bleiben dadurch unabhängig davon, wie viele Automaten aktiv sind.
export type HallUpgradeId = keyof HallUpgradeLevels;

export interface HallUpgradeDefinition {
  id: HallUpgradeId;
  name: string;
  costBasis: number;
  costWachstum: number;
  maxLevel?: number;
  describeEffect: (level: number) => string;
}

export const HALL_UPGRADE_DEFINITIONS: readonly HallUpgradeDefinition[] = [
  {
    id: 'hallenSammler',
    name: 'Hallen-Sammler',
    costBasis: HALLEN_SAMMLER_COST_BASIS,
    costWachstum: HALLEN_SAMMLER_COST_WACHSTUM,
    describeEffect: (level) => `+${Math.round(level * HALLEN_SAMMLER_SHARE_BONUS_PER_LEVEL * 100)} % Hallen-Credits-Ertrag`,
  },
  {
    id: 'automatenRabatt',
    name: 'Automaten-Rabatt',
    costBasis: AUTOMATEN_RABATT_COST_BASIS,
    costWachstum: AUTOMATEN_RABATT_COST_WACHSTUM,
    maxLevel: AUTOMATEN_RABATT_MAX_LEVEL,
    describeEffect: (level) => `-${Math.round(level * AUTOMATEN_RABATT_REDUKTION_PRO_LEVEL * 100)} % Freischaltkosten`,
  },
];

export function getHallUpgradeDefinition(id: HallUpgradeId): HallUpgradeDefinition {
  const definition = HALL_UPGRADE_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unbekanntes Hallen-Upgrade: ${id}`);
  }
  return definition;
}

export function getHallUpgradeCost(id: HallUpgradeId, currentLevel: number): Decimal {
  const definition = getHallUpgradeDefinition(id);
  return new Decimal(definition.costBasis).mul(Decimal.pow(definition.costWachstum, currentLevel)).round();
}

export function getHallUpgradeMaxLevel(id: HallUpgradeId): number | undefined {
  return getHallUpgradeDefinition(id).maxLevel;
}

// Multiplikator auf den Hallen-Credits-Aggregations-Anteil (siehe
// hall/HallCredits.ts), 1 bei Stufe 0.
export function computeHallCreditsShareMultiplier(hallUpgrades: HallUpgradeLevels): number {
  return 1 + hallUpgrades.hallenSammler * HALLEN_SAMMLER_SHARE_BONUS_PER_LEVEL;
}

// Multiplikator auf die Freischaltkosten (siehe hall/UnlockLogic.ts), geclampt
// auf AUTOMATEN_RABATT_MIN_MULTIPLIKATOR — Freischaltungen dürfen günstiger,
// aber nie kostenlos werden.
export function computeUnlockCostMultiplier(hallUpgrades: HallUpgradeLevels): number {
  return Math.max(
    1 - hallUpgrades.automatenRabatt * AUTOMATEN_RABATT_REDUKTION_PRO_LEVEL,
    AUTOMATEN_RABATT_MIN_MULTIPLIKATOR,
  );
}
