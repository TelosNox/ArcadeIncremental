import { Decimal } from '../../../core/BigNumber';

// Score-Formel für Automat 2 (mit dem Nutzer vor der Umsetzung abgestimmt,
// DOCS/IMPLEMENTATION_PLAN.md Phase 5):
// score = Σ (treffer_i × basis_punkte × serien_bonus_i) + (wellen_geschafft × wellen_bonus)
//
// Kein Strafpunkte-Term mehr (mit dem Nutzer abgestimmt: Strafpunkte wirken
// kontraproduktiv aufs Spielerlebnis, gilt für alle Automaten). Ein
// Fehlschuss (Schuss verlässt den Bildschirm ohne Treffer) bricht nur die
// Trefferserie und damit den serien_bonus — keine direkte Score-Strafe.
// serien_bonus wächst mit der aktuellen Trefferserie — das
// Zielgenauigkeits-Äquivalent zu zeit_bonus bei Automat 1 (siehe
// machine01-whackamole/scoring.ts).
export interface ScoreFormulaParams {
  basisPunkte: number;
  serienBonusProTreffer: number;
  serienBonusMin: number;
  serienBonusMax: number;
  wellenBonus: number;
  scoreMultiplier: number;
}

export function computeSerienBonus(
  streak: number,
  params: Pick<ScoreFormulaParams, 'serienBonusProTreffer' | 'serienBonusMin' | 'serienBonusMax'>,
): number {
  const raw = params.serienBonusMin + streak * params.serienBonusProTreffer;
  return Math.min(Math.max(raw, params.serienBonusMin), params.serienBonusMax);
}

export function computeHitScore(streak: number, params: ScoreFormulaParams): Decimal {
  return new Decimal(params.basisPunkte).mul(computeSerienBonus(streak, params)).mul(params.scoreMultiplier).round();
}

export function computeWaveBonus(params: Pick<ScoreFormulaParams, 'wellenBonus' | 'scoreMultiplier'>): Decimal {
  return new Decimal(params.wellenBonus).mul(params.scoreMultiplier).round();
}

export function applyHit(currentScore: Decimal, streak: number, params: ScoreFormulaParams): Decimal {
  return currentScore.add(computeHitScore(streak, params));
}

export function applyWaveCleared(currentScore: Decimal, params: Pick<ScoreFormulaParams, 'wellenBonus' | 'scoreMultiplier'>): Decimal {
  return currentScore.add(computeWaveBonus(params));
}
