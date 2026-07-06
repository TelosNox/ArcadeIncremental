// Einzige Quelle für Balance-Konstanten (CLAUDE.md, Architektur-Regel 2).
// Werte referenzieren die jeweiligen Abschnitte in DOCS/SPECIFICATION.md.

// Abschnitt 5: Offline-Progress-Cap für passive_rate-Gutschriften.
export const OFFLINE_PROGRESS_CAP_MS = 8 * 60 * 60 * 1000;

// Abschnitt 4a: Score-zu-Credits-Umrechnung (aktuell nur Automat 1, laut
// Spezifikation explizit hier statt in der Automaten-config.ts verortet).
export const SCORE_TO_CREDITS_DIVISOR = 5;
