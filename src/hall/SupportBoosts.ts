import { Decimal } from '../core/BigNumber';
import type { SupportBoostLevels } from '../state/GameState';
import {
  KOPFSTART_BASE_SCORE_PRO_LEVEL,
  KOPFSTART_COST_BASIS,
  KOPFSTART_COST_WACHSTUM,
  KOPFSTART_MAX_LEVEL,
  SLOW_MOTION_COST_BASIS,
  SLOW_MOTION_COST_WACHSTUM,
  SLOW_MOTION_MAX_LEVEL,
  TRAINER_COST_BASIS,
  TRAINER_COST_WACHSTUM,
  TRAINER_SCORE_BONUS_PRO_LEVEL,
} from '../config/balance';

// Support-Boosts (SPECIFICATION.md Abschnitt 6): mit Hallen-Credits finanziert,
// wirken auf einen einzelnen Automaten statt auf die Halle als Ganzes (siehe
// hall/HallUpgrades.ts für den Gegenpart). Seit Phase 5 führt jeder Automat
// sein eigenes SupportBoostLevels-Set (siehe state/GameState.ts) — dieselbe
// Definition/Kosten/Effekt-Logik gilt für alle Automaten gleichermaßen.
export type SupportBoostId = keyof SupportBoostLevels;

export interface SupportBoostDefinition {
  id: SupportBoostId;
  name: string;
  costBasis: number;
  costWachstum: number;
  maxLevel?: number;
  describeEffect: (level: number) => string;
}

export const SUPPORT_BOOST_DEFINITIONS: readonly SupportBoostDefinition[] = [
  {
    id: 'trainer',
    name: 'Trainer',
    costBasis: TRAINER_COST_BASIS,
    costWachstum: TRAINER_COST_WACHSTUM,
    describeEffect: (level) => `+${Math.round(level * TRAINER_SCORE_BONUS_PRO_LEVEL * 100)} % Score-Multiplikator`,
  },
  {
    // Effekt ist bewusst automatenspezifisch (siehe ui/UpgradePanel.ts,
    // describeSupportBoostEffect je Automat) — "macht den Run leichter"
    // bedeutet bei Automat 1 längere Mole-Sichtbarkeit, bei Automat 2 mehr
    // Leben. describeEffect hier ist nur der generische Fallback.
    id: 'slowMotion',
    name: 'Slow-Motion-Charge / Extra-Leben',
    costBasis: SLOW_MOTION_COST_BASIS,
    costWachstum: SLOW_MOTION_COST_WACHSTUM,
    maxLevel: SLOW_MOTION_MAX_LEVEL,
    describeEffect: (level) => `Macht Runs leichter (Stufe ${level})`,
  },
  {
    id: 'kopfstart',
    name: 'Kopfstart',
    costBasis: KOPFSTART_COST_BASIS,
    costWachstum: KOPFSTART_COST_WACHSTUM,
    maxLevel: KOPFSTART_MAX_LEVEL,
    describeEffect: (level) => `Run startet mit +${level * KOPFSTART_BASE_SCORE_PRO_LEVEL} Basis-Score`,
  },
];

export function getSupportBoostDefinition(id: SupportBoostId): SupportBoostDefinition {
  const definition = SUPPORT_BOOST_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unbekannter Support-Boost: ${id}`);
  }
  return definition;
}

export function getSupportBoostCost(id: SupportBoostId, currentLevel: number): Decimal {
  const definition = getSupportBoostDefinition(id);
  return new Decimal(definition.costBasis).mul(Decimal.pow(definition.costWachstum, currentLevel)).round();
}

export function getSupportBoostMaxLevel(id: SupportBoostId): number | undefined {
  return getSupportBoostDefinition(id).maxLevel;
}

export function computeTrainerScoreBonus(supportBoosts: SupportBoostLevels): number {
  return supportBoosts.trainer * TRAINER_SCORE_BONUS_PRO_LEVEL;
}

export function computeKopfstartBaseScore(supportBoosts: SupportBoostLevels): number {
  return supportBoosts.kopfstart * KOPFSTART_BASE_SCORE_PRO_LEVEL;
}
