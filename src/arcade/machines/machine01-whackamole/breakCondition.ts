import type { Decimal } from '../../../core/BigNumber';
import { BASELINE_AVERAGE_SCORE_PER_RUN, K_AVG, SKILL_MULTIPLIER_MIN, S_BREAK, S_MAX } from './config';

// Break-Bedingung (SPECIFICATION.md Abschnitt 4): score(n) = S_max × (1 − e^(−n/k)),
// k = k_avg / m. Pur und testbar, die Scene fragt nur noch hasReachedBreak()/
// computeBreakProgress() ab.

export function computeSkillMultiplier(averageScorePerRun: number): number {
  return Math.max(averageScorePerRun / BASELINE_AVERAGE_SCORE_PER_RUN, SKILL_MULTIPLIER_MIN);
}

export function computeBreakCurveScore(runCount: number, skillMultiplier: number): number {
  const k = K_AVG / skillMultiplier;
  return S_MAX * (1 - Math.exp(-runCount / k));
}

// 0..1-Fortschritt zur Break-Schwelle — Grundlage für den unbeschrifteten
// Anomalie-Hinweis in der Scene (SPECIFICATION.md Abschnitt 4: die
// Oberfläche darf die Nähe zum Ereignis andeuten, ohne seine Bedeutung zu
// verraten).
export function computeBreakProgress(runCount: number, totalScore: Decimal): number {
  if (runCount <= 0) {
    return 0;
  }
  const averageScorePerRun = totalScore.div(runCount).toNumber();
  const skillMultiplier = computeSkillMultiplier(averageScorePerRun);
  const curveScore = computeBreakCurveScore(runCount, skillMultiplier);
  return Math.min(Math.max(curveScore / S_BREAK, 0), 1);
}

export function hasReachedBreak(runCount: number, totalScore: Decimal): boolean {
  return computeBreakProgress(runCount, totalScore) >= 1;
}
