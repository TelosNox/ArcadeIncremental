import { Decimal } from '../../../core/BigNumber';
import { BASIS_PUNKTE, STRAFE, ZEIT_BONUS_MAX, ZEIT_BONUS_MIN, ZEIT_BONUS_REFERENCE_MS } from './config';

// Score-Formel (SPECIFICATION.md Abschnitt 4a):
// score = Σ (treffer_i × basis_punkte × zeit_bonus_i) − (fehlklicks × strafe)
// Aus der Scene extrahiert, damit sie ohne Phaser testbar bleibt.

export function computeZeitBonus(reaktionszeitMs: number): number {
  const raw = 2 - reaktionszeitMs / ZEIT_BONUS_REFERENCE_MS;
  return Math.min(Math.max(raw, ZEIT_BONUS_MIN), ZEIT_BONUS_MAX);
}

export function computeHitScore(reaktionszeitMs: number): Decimal {
  // zeit_bonus ist ein Bruchwert (SPECIFICATION.md Abschnitt 4a) — Punkte
  // sollen aber immer Ganzzahlen sein, deshalb hier runden statt erst am
  // Run-Ende.
  return new Decimal(BASIS_PUNKTE).mul(computeZeitBonus(reaktionszeitMs)).round();
}

export function computeMissPenalty(): Decimal {
  return new Decimal(STRAFE);
}

export function applyHit(currentScore: Decimal, reaktionszeitMs: number): Decimal {
  return currentScore.add(computeHitScore(reaktionszeitMs));
}

export function applyMiss(currentScore: Decimal): Decimal {
  return currentScore.sub(computeMissPenalty());
}
