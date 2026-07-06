import { OFFLINE_PROGRESS_CAP_MS } from '../config/balance';

// Stub für Offline-Progress (DOCS/SPECIFICATION.md Abschnitt 5): deckelt die
// angerechnete Abwesenheitsdauer. Die eigentliche passive_rate-Gutschrift
// folgt erst ab Phase 3, sobald automatisierte Automaten existieren.
export function capOfflineDuration(elapsedMs: number): number {
  if (elapsedMs < 0) {
    return 0;
  }
  return Math.min(elapsedMs, OFFLINE_PROGRESS_CAP_MS);
}
