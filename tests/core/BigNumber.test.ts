import { describe, expect, it } from 'vitest';
import { Decimal, fromSerializable, toSerializable, ZERO } from '../../src/core/BigNumber';

describe('BigNumber wrapper', () => {
  it('handles magnitudes far beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = new Decimal('1e300');
    const doubled = huge.mul(2);

    expect(doubled.gt(huge)).toBe(true);
    expect(doubled.div(2).eq(huge)).toBe(true);
  });

  it('round-trips through string serialization without precision loss', () => {
    const original = new Decimal('1.2345e50');
    const restored = fromSerializable(toSerializable(original));

    expect(restored.eq(original)).toBe(true);
  });

  it('exposes ZERO as the additive identity', () => {
    const value = new Decimal(42);
    expect(value.add(ZERO).eq(value)).toBe(true);
  });
});
