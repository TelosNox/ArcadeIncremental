import { Decimal } from '../../../core/BigNumber';
import { computeKopfstartBaseScore, computeTrainerScoreBonus } from '../../../hall/SupportBoosts';
import type { Machine01UpgradeLevels, SupportBoostLevels } from '../../../state/GameState';
import {
  BASIS_PUNKTE,
  GROESSERER_HAMMER_COST_BASIS,
  GROESSERER_HAMMER_COST_WACHSTUM,
  GROESSERER_HAMMER_RADIUS_PX_PER_LEVEL,
  MOLE_VISIBLE_DURATION_MS,
  RUN_DURATION_MS,
  SCHNELLERE_REFLEXE_COST_BASIS,
  SCHNELLERE_REFLEXE_COST_WACHSTUM,
  SCHNELLERE_REFLEXE_MS_PER_LEVEL,
  SCORE_MULTIPLIKATOR_COST_BASIS,
  SCORE_MULTIPLIKATOR_COST_WACHSTUM,
  SCORE_MULTIPLIKATOR_PER_LEVEL,
  SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL,
  VERLAENGERTE_RUNDE_COST_BASIS,
  VERLAENGERTE_RUNDE_COST_WACHSTUM,
  VERLAENGERTE_RUNDE_MAX_LEVEL,
  VERLAENGERTE_RUNDE_MS_PER_LEVEL,
  ZEIT_BONUS_MAX,
  ZEIT_BONUS_MIN,
  ZEIT_BONUS_REFERENCE_MS,
} from './config';
import type { ScoreFormulaParams } from './scoring';

export type Machine01UpgradeId = keyof Machine01UpgradeLevels;

export interface UpgradeDefinition {
  id: Machine01UpgradeId;
  name: string;
  costBasis: number;
  costWachstum: number;
  maxLevel?: number;
  describeEffect: (level: number) => string;
}

// Upgrade-Liste (SPECIFICATION.md Abschnitt 4a). Kostenformel `basis ×
// wachstum^level` exakt aus der Tabelle; Effektbeschreibungen für das
// Upgrade-Panel (Abschnitt 10). "Fehlerverzeihung" (reduzierte Strafe pro
// verpasster Mole) ist entfallen, seit Strafpunkte komplett aus allen
// Automaten entfernt wurden (mit dem Nutzer abgestimmt).
export const UPGRADE_DEFINITIONS: readonly UpgradeDefinition[] = [
  {
    id: 'schnellereReflexe',
    name: 'Schnellere Reflexe',
    costBasis: SCHNELLERE_REFLEXE_COST_BASIS,
    costWachstum: SCHNELLERE_REFLEXE_COST_WACHSTUM,
    describeEffect: (level) => `Zeitfenster für hohen Bonus +${level * SCHNELLERE_REFLEXE_MS_PER_LEVEL}ms`,
  },
  {
    id: 'groessererHammer',
    name: 'Größerer Hammer',
    costBasis: GROESSERER_HAMMER_COST_BASIS,
    costWachstum: GROESSERER_HAMMER_COST_WACHSTUM,
    describeEffect: (level) => `Hover-Reichweite +${level * GROESSERER_HAMMER_RADIUS_PX_PER_LEVEL}px`,
  },
  {
    id: 'scoreMultiplikator',
    name: 'Score-Multiplikator',
    costBasis: SCORE_MULTIPLIKATOR_COST_BASIS,
    costWachstum: SCORE_MULTIPLIKATOR_COST_WACHSTUM,
    describeEffect: (level) => `+${Math.round(level * SCORE_MULTIPLIKATOR_PER_LEVEL * 100)} % Score`,
  },
  {
    id: 'verlaengerteRunde',
    name: 'Verlängerte Runde',
    costBasis: VERLAENGERTE_RUNDE_COST_BASIS,
    costWachstum: VERLAENGERTE_RUNDE_COST_WACHSTUM,
    maxLevel: VERLAENGERTE_RUNDE_MAX_LEVEL,
    describeEffect: (level) => `+${(level * VERLAENGERTE_RUNDE_MS_PER_LEVEL) / 1000}s Run-Dauer`,
  },
];

export function getUpgradeDefinition(id: Machine01UpgradeId): UpgradeDefinition {
  const definition = UPGRADE_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unbekanntes Upgrade: ${id}`);
  }
  return definition;
}

export function getUpgradeCost(id: Machine01UpgradeId, currentLevel: number): Decimal {
  const definition = getUpgradeDefinition(id);
  return new Decimal(definition.costBasis).mul(Decimal.pow(definition.costWachstum, currentLevel)).round();
}

export function getUpgradeMaxLevel(id: Machine01UpgradeId): number | undefined {
  return getUpgradeDefinition(id).maxLevel;
}

export interface EffectiveMachine01Params extends ScoreFormulaParams {
  hitRadiusBonusPx: number;
  runDurationMs: number;
  moleVisibleDurationMs: number; // Support-Boost "Slow-Motion-Charge/Extra-Leben", hall/SupportBoosts.ts
  startScore: number; // Support-Boost "Kopfstart", hall/SupportBoosts.ts
}

// Wendet die aktuellen Upgrade-Level UND Hallen-Support-Boosts (Phase 4,
// SPECIFICATION.md Abschnitt 6) auf die Basiswerte an. RUN_DURATION_MS selbst
// bleibt unverändert in config.ts — hier kommt nur der Bonus obendrauf.
// Support-Boosts wirken additiv zusätzlich zu den lokalen Upgrades (z. B.
// Trainer-Bonus zusätzlich zum Score-Multiplikator-Upgrade).
export function computeEffectiveParams(
  upgrades: Machine01UpgradeLevels,
  supportBoosts: SupportBoostLevels,
): EffectiveMachine01Params {
  return {
    basisPunkte: BASIS_PUNKTE,
    zeitBonusReferenceMs: ZEIT_BONUS_REFERENCE_MS + upgrades.schnellereReflexe * SCHNELLERE_REFLEXE_MS_PER_LEVEL,
    zeitBonusMin: ZEIT_BONUS_MIN,
    zeitBonusMax: ZEIT_BONUS_MAX,
    scoreMultiplier:
      1 + upgrades.scoreMultiplikator * SCORE_MULTIPLIKATOR_PER_LEVEL + computeTrainerScoreBonus(supportBoosts),
    hitRadiusBonusPx: upgrades.groessererHammer * GROESSERER_HAMMER_RADIUS_PX_PER_LEVEL,
    runDurationMs: RUN_DURATION_MS + upgrades.verlaengerteRunde * VERLAENGERTE_RUNDE_MS_PER_LEVEL,
    // Seit Strafpunkte entfernt wurden, wirkt "Slow-Motion-Charge/Extra-
    // Leben" proaktiv statt reaktiv: Moles bleiben pro Boost-Stufe länger
    // sichtbar, statt eine (nicht mehr existente) Strafe zu erlassen.
    moleVisibleDurationMs: MOLE_VISIBLE_DURATION_MS + supportBoosts.slowMotion * SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL,
    startScore: computeKopfstartBaseScore(supportBoosts),
  };
}
