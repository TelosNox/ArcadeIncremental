import { describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { formatNumber } from '../../src/ui/formatNumber';

describe('formatNumber', () => {
  it('rounds a fractional Decimal to a whole number', () => {
    expect(formatNumber(new Decimal(10.7))).toBe('11');
  });

  it('rounds a negative fractional Decimal correctly', () => {
    expect(formatNumber(new Decimal(-4892.984))).toBe('-4893');
  });

  it('accepts plain numbers as a convenience', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(3.2)).toBe('3');
  });

  it('leaves whole numbers unchanged', () => {
    expect(formatNumber(new Decimal(42))).toBe('42');
  });

  it('handles magnitudes far beyond native precision without throwing', () => {
    expect(formatNumber(new Decimal('1e50'))).toBe(new Decimal('1e50').round().toString());
  });
});
