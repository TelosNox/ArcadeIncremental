// Automat 1 (Whac-a-Mole) — automatenspezifische Werte aus SPECIFICATION.md
// Abschnitt 4a. Upgrades und Break-Schwellenwerte folgen in späteren Phasen.

export const BASIS_PUNKTE = 10;
export const STRAFE = 5; // pro Fehlklick auf ein leeres Loch

export const ZEIT_BONUS_REFERENCE_MS = 500;
export const ZEIT_BONUS_MIN = 0.5;
export const ZEIT_BONUS_MAX = 2;

// Verkürzt von ursprünglich 60s (Abschnitt 4a / 9) auf 30s, da der erste Run
// als zu lang empfunden wurde. SPECIFICATION.md Abschnitt 9 entsprechend
// angepasst. TODO: Falls in Phase 3 die Break-Schwelle (k_avg) kalibriert
// wird, berücksichtigen, dass ein Run jetzt ~halb so viel Score liefert.
export const RUN_DURATION_MS = 30_000;

// Spezifikationslücke: SPECIFICATION.md beziffert nur "steigende Mole-
// Erscheinungsrate im Verlauf eines Runs", ohne konkrete Werte. Sinnvolle
// Annahme fürs erste Playtesting, kein final kalibrierter Balance-Wert.
export const HOLE_COUNT = 9;
export const MOLE_SPAWN_INTERVAL_START_MS = 1200;
export const MOLE_SPAWN_INTERVAL_END_MS = 500;
export const MOLE_VISIBLE_DURATION_MS = 900;

// Trefferfeedback (rein visuell, kein Balance-Wert aus der Spezifikation):
// Ab diesem zeit_bonus (Bereich 0.5-2, siehe oben) gilt ein Treffer als
// "Perfekt" und bekommt auffälligeres Feedback. Sinnvolle Annahme, keine
// Vorgabe in SPECIFICATION.md.
export const PERFEKT_ZEIT_BONUS_THRESHOLD = 1.5;

export const PERFECT_HIT_COLOR = 0xffd54a;
export const NORMAL_HIT_COLOR = 0x9fd89f;
export const MISS_COLOR = 0xdd4444;

export const HIT_FEEDBACK_DURATION_MS = 450;
export const MISS_FEEDBACK_DURATION_MS = 450;
export const PUNCH_TWEEN_DURATION_MS = 90;
export const MISS_FLASH_DURATION_MS = 200;
export const FEEDBACK_RISE_DISTANCE_PX = 60;
