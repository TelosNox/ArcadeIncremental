import { describe, expect, it } from 'vitest';
import { applyMigrations, type Migration } from '../../src/persistence/schema';

describe('applyMigrations', () => {
  it('applies each migration in sequence until the target version is reached', () => {
    const steps: Migration[] = [
      (s) => ({ ...(s as Record<string, unknown>), step: 1 }),
      (s) => ({ ...(s as Record<string, unknown>), step: 2 }),
    ];

    const result = applyMigrations({}, 0, 2, steps);

    expect(result).toEqual({ ok: true, state: { step: 2 }, reachedVersion: 2 });
  });

  it('returns the state unchanged when already at the target version', () => {
    const result = applyMigrations({ foo: 'bar' }, 2, 2, []);

    expect(result).toEqual({ ok: true, state: { foo: 'bar' }, reachedVersion: 2 });
  });

  it('reports an error instead of guessing when a migration step is missing', () => {
    const result = applyMigrations({}, 0, 3, [(s) => s]);

    expect(result).toEqual({ ok: false, error: 'Keine Migration von Version 1 verfügbar.' });
  });
});
