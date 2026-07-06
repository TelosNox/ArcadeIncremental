import { describe, expect, it } from 'vitest';
import { scoreToCredits } from '../../src/arcade/shared/ScoreToCurrency';
import { Decimal } from '../../src/core/BigNumber';

describe('scoreToCredits', () => {
  it('divides score by the divisor and floors the result (SPECIFICATION.md Abschnitt 4a)', () => {
    expect(scoreToCredits(new Decimal(87), 5).eq(17)).toBe(true);
  });

  it('floors exact multiples unchanged', () => {
    expect(scoreToCredits(new Decimal(100), 5).eq(20)).toBe(true);
  });

  it('clamps a negative score (viele Fehlklicks) to zero credits', () => {
    expect(scoreToCredits(new Decimal(-30), 5).eq(0)).toBe(true);
  });

  it('handles scores far beyond native precision', () => {
    expect(scoreToCredits(new Decimal('1e50'), 5).eq(new Decimal('2e49'))).toBe(true);
  });
});
