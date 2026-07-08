import { Decimal } from '../../../core/BigNumber';

// Effektive Parameter für die Score-Formel (SPECIFICATION.md Abschnitt 4a),
// nachdem aktuelle Automat-1-Upgrades angewendet wurden (siehe
// upgrades.ts:computeEffectiveParams). Aus der Scene extrahiert, damit die
// Formel ohne Phaser testbar bleibt.
export interface ScoreFormulaParams {
  basisPunkte: number;
  zeitBonusReferenceMs: number;
  zeitBonusMin: number;
  zeitBonusMax: number;
  scoreMultiplier: number;
}

// Score-Formel (SPECIFICATION.md Abschnitt 4a):
// score = Σ (treffer_i × basis_punkte × zeit_bonus_i)
// "Treffer" = Cursor kam in Reichweite einer aktiven Mole (Hover-Mechanik,
// siehe WhackAMoleScene.checkHoverHits). Kein Strafpunkte-Term mehr für
// verpasste Moles (mit dem Nutzer abgestimmt: Strafpunkte wirken
// kontraproduktiv aufs Spielerlebnis, gilt für alle Automaten) — eine
// verpasste Mole bleibt Score-neutral.

export function computeZeitBonus(
  reaktionszeitMs: number,
  params: Pick<ScoreFormulaParams, 'zeitBonusReferenceMs' | 'zeitBonusMin' | 'zeitBonusMax'>,
): number {
  // zeitBonusMax dient in der Spezifikation gleichzeitig als Basiswert der
  // Formel (`2 - reaktionszeit_ms / 500`) und als obere Clamp-Grenze.
  const raw = params.zeitBonusMax - reaktionszeitMs / params.zeitBonusReferenceMs;
  return Math.min(Math.max(raw, params.zeitBonusMin), params.zeitBonusMax);
}

export function computeHitScore(reaktionszeitMs: number, params: ScoreFormulaParams): Decimal {
  // zeit_bonus und scoreMultiplier sind Bruchwerte — Punkte sollen aber immer
  // Ganzzahlen sein, deshalb hier runden statt erst am Run-Ende.
  return new Decimal(params.basisPunkte)
    .mul(computeZeitBonus(reaktionszeitMs, params))
    .mul(params.scoreMultiplier)
    .round();
}

export function applyHit(currentScore: Decimal, reaktionszeitMs: number, params: ScoreFormulaParams): Decimal {
  return currentScore.add(computeHitScore(reaktionszeitMs, params));
}
