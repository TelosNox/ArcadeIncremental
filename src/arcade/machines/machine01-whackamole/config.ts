// Automat 1 (Whac-a-Mole) — automatenspezifische Werte aus SPECIFICATION.md
// Abschnitt 4a. Upgrades und Break-Schwellenwerte folgen in späteren Phasen.

export const BASIS_PUNKTE = 10;
export const STRAFE = 5; // pro Fehlklick auf ein leeres Loch

export const ZEIT_BONUS_REFERENCE_MS = 500;
export const ZEIT_BONUS_MIN = 0.5;
export const ZEIT_BONUS_MAX = 2;

export const RUN_DURATION_MS = 60_000; // 60s initial (Abschnitt 4a / 9)

// Spezifikationslücke: SPECIFICATION.md beziffert nur "steigende Mole-
// Erscheinungsrate im Verlauf eines Runs", ohne konkrete Werte. Sinnvolle
// Annahme fürs erste Playtesting, kein final kalibrierter Balance-Wert.
export const HOLE_COUNT = 9;
export const MOLE_SPAWN_INTERVAL_START_MS = 1200;
export const MOLE_SPAWN_INTERVAL_END_MS = 500;
export const MOLE_VISIBLE_DURATION_MS = 900;
