import type { Decimal } from '../../../core/BigNumber';
import { BASELINE_AVERAGE_SCORE_PER_RUN, K_AVG, SKILL_MULTIPLIER_MIN, S_BREAK, S_MAX } from './config';

// Break-Bedingung (SPECIFICATION.md Abschnitt 4): score(n) = S_max × (1 − e^(−n/k)),
// k = k_avg / m. Pur und testbar, die Scene fragt nur noch hasReachedBreak() ab.

export function computeSkillMultiplier(averageScorePerRun: number): number {
  return Math.max(averageScorePerRun / BASELINE_AVERAGE_SCORE_PER_RUN, SKILL_MULTIPLIER_MIN);
}

export function computeBreakCurveScore(runCount: number, skillMultiplier: number): number {
  const k = K_AVG / skillMultiplier;
  return S_MAX * (1 - Math.exp(-runCount / k));
}

export function hasReachedBreak(runCount: number, totalScore: Decimal): boolean {
  if (runCount <= 0) {
    return false;
  }
  const averageScorePerRun = totalScore.div(runCount).toNumber();
  const skillMultiplier = computeSkillMultiplier(averageScorePerRun);
  return computeBreakCurveScore(runCount, skillMultiplier) >= S_BREAK;
}
