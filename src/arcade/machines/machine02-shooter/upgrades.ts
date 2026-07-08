import { Decimal } from '../../../core/BigNumber';
import { computeKopfstartBaseScore, computeTrainerScoreBonus } from '../../../hall/SupportBoosts';
import type { Machine02UpgradeLevels, SupportBoostLevels } from '../../../state/GameState';
import {
  BASIS_PUNKTE,
  BREITERER_KANONENKOPF_COST_BASIS,
  BREITERER_KANONENKOPF_COST_WACHSTUM,
  BREITERER_KANONENKOPF_RADIUS_PX_PRO_LEVEL,
  CANNON_COOLDOWN_MS,
  HIT_RADIUS_PX,
  SCHNELLFEUER_COOLDOWN_MIN_MS,
  SCHNELLFEUER_COOLDOWN_REDUKTION_MS_PRO_LEVEL,
  SCHNELLFEUER_COST_BASIS,
  SCHNELLFEUER_COST_WACHSTUM,
  SCORE_MULTIPLIKATOR_COST_BASIS,
  SCORE_MULTIPLIKATOR_COST_WACHSTUM,
  SCORE_MULTIPLIKATOR_PRO_LEVEL,
  SERIEN_BONUS_MAX,
  SERIEN_BONUS_MIN,
  SERIEN_BONUS_PRO_TREFFER,
  START_LEBEN,
  VERSTAERKTER_RUMPF_COST_BASIS,
  VERSTAERKTER_RUMPF_COST_WACHSTUM,
  VERSTAERKTER_RUMPF_LEBEN_PRO_LEVEL,
  VERSTAERKTER_RUMPF_MAX_LEVEL,
  WELLEN_BONUS,
} from './config';
import type { ScoreFormulaParams } from './scoring';

export type Machine02UpgradeId = keyof Machine02UpgradeLevels;

export interface UpgradeDefinition {
  id: Machine02UpgradeId;
  name: string;
  costBasis: number;
  costWachstum: number;
  maxLevel?: number;
  describeEffect: (level: number) => string;
}

// Upgrade-Liste (SPECIFICATION.md Abschnitt 7, mit dem Nutzer vor der
// Umsetzung abgestimmt) — bewusst symmetrisch zu Automat 1 (Abschnitt 4a):
// drei Gameplay-Upgrades, nur der Score-Multiplikator ist ein reiner
// abstrakter Hebel (Aktiv-vor-Passiv-Prinzip, siehe CLAUDE.md). "Zielcomputer"
// (reduzierte Fehlschuss-Strafe) ist entfallen, seit Strafpunkte komplett
// aus allen Automaten entfernt wurden (mit dem Nutzer abgestimmt).
export const UPGRADE_DEFINITIONS: readonly UpgradeDefinition[] = [
  {
    id: 'schnellfeuer',
    name: 'Schnellfeuer',
    costBasis: SCHNELLFEUER_COST_BASIS,
    costWachstum: SCHNELLFEUER_COST_WACHSTUM,
    describeEffect: (level) => `Schuss-Cooldown −${level * SCHNELLFEUER_COOLDOWN_REDUKTION_MS_PRO_LEVEL}ms`,
  },
  {
    id: 'breiterKanonenkopf',
    name: 'Breiterer Kanonenkopf',
    costBasis: BREITERER_KANONENKOPF_COST_BASIS,
    costWachstum: BREITERER_KANONENKOPF_COST_WACHSTUM,
    describeEffect: (level) => `Trefferzone +${level * BREITERER_KANONENKOPF_RADIUS_PX_PRO_LEVEL}px`,
  },
  {
    id: 'scoreMultiplikator',
    name: 'Score-Multiplikator',
    costBasis: SCORE_MULTIPLIKATOR_COST_BASIS,
    costWachstum: SCORE_MULTIPLIKATOR_COST_WACHSTUM,
    describeEffect: (level) => `+${Math.round(level * SCORE_MULTIPLIKATOR_PRO_LEVEL * 100)} % Score`,
  },
  {
    id: 'verstaerkterRumpf',
    name: 'Verstärkter Rumpf',
    costBasis: VERSTAERKTER_RUMPF_COST_BASIS,
    costWachstum: VERSTAERKTER_RUMPF_COST_WACHSTUM,
    maxLevel: VERSTAERKTER_RUMPF_MAX_LEVEL,
    describeEffect: (level) => `+${level * VERSTAERKTER_RUMPF_LEBEN_PRO_LEVEL} Leben`,
  },
];

export function getUpgradeDefinition(id: Machine02UpgradeId): UpgradeDefinition {
  const definition = UPGRADE_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unbekanntes Upgrade: ${id}`);
  }
  return definition;
}

export function getUpgradeCost(id: Machine02UpgradeId, currentLevel: number): Decimal {
  const definition = getUpgradeDefinition(id);
  return new Decimal(definition.costBasis).mul(Decimal.pow(definition.costWachstum, currentLevel)).round();
}

export function getUpgradeMaxLevel(id: Machine02UpgradeId): number | undefined {
  return getUpgradeDefinition(id).maxLevel;
}

export interface EffectiveMachine02Params extends ScoreFormulaParams {
  cannonCooldownMs: number;
  hitRadiusPx: number;
  startLeben: number;
  startScore: number; // Support-Boost "Kopfstart", hall/SupportBoosts.ts
}

// Wendet die aktuellen Upgrade-Level UND Hallen-Support-Boosts (Phase 4/5,
// SPECIFICATION.md Abschnitt 6) auf die Basiswerte an — analog zu
// machine01-whackamole/upgrades.ts:computeEffectiveParams. "Slow-Motion-
// Charge/Extra-Leben" wird hier direkt als zusätzliches Leben ausgezahlt
// (statt straffreier Fehlschüsse wie bei Automat 1) — passt bei einem
// Wellen-Überlebens-Automaten näher an den Boost-Namen aus Abschnitt 6.
export function computeEffectiveParams(
  upgrades: Machine02UpgradeLevels,
  supportBoosts: SupportBoostLevels,
): EffectiveMachine02Params {
  return {
    basisPunkte: BASIS_PUNKTE,
    serienBonusProTreffer: SERIEN_BONUS_PRO_TREFFER,
    serienBonusMin: SERIEN_BONUS_MIN,
    serienBonusMax: SERIEN_BONUS_MAX,
    wellenBonus: WELLEN_BONUS,
    scoreMultiplier:
      1 + upgrades.scoreMultiplikator * SCORE_MULTIPLIKATOR_PRO_LEVEL + computeTrainerScoreBonus(supportBoosts),
    cannonCooldownMs: Math.max(
      CANNON_COOLDOWN_MS - upgrades.schnellfeuer * SCHNELLFEUER_COOLDOWN_REDUKTION_MS_PRO_LEVEL,
      SCHNELLFEUER_COOLDOWN_MIN_MS,
    ),
    hitRadiusPx: HIT_RADIUS_PX + upgrades.breiterKanonenkopf * BREITERER_KANONENKOPF_RADIUS_PX_PRO_LEVEL,
    startLeben: START_LEBEN + upgrades.verstaerkterRumpf * VERSTAERKTER_RUMPF_LEBEN_PRO_LEVEL + supportBoosts.slowMotion,
    startScore: computeKopfstartBaseScore(supportBoosts),
  };
}
