import { describe, expect, it } from 'vitest';
import { capOfflineDuration } from '../../src/core/OfflineProgress';
import { OFFLINE_PROGRESS_CAP_MS } from '../../src/config/balance';

describe('capOfflineDuration', () => {
  it('passes through durations under the cap unchanged', () => {
    expect(capOfflineDuration(1000)).toBe(1000);
  });

  it('caps durations above 8 hours (SPECIFICATION.md Abschnitt 5)', () => {
    const twelveHours = 12 * 60 * 60 * 1000;
    expect(capOfflineDuration(twelveHours)).toBe(OFFLINE_PROGRESS_CAP_MS);
  });

  it('treats the cap boundary as inclusive', () => {
    expect(capOfflineDuration(OFFLINE_PROGRESS_CAP_MS)).toBe(OFFLINE_PROGRESS_CAP_MS);
  });

  it('clamps negative durations (e.g. Clock-Skew) to zero', () => {
    expect(capOfflineDuration(-500)).toBe(0);
  });
});
