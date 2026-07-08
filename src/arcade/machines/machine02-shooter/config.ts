// Automat 2 (Space-Invaders-Shooter) — automatenspezifische Werte aus
// SPECIFICATION.md Abschnitt 7 ("Zielgenauigkeit, Wellen überleben").
// Kein Blind/Reveal-Twist (Abschnitt 1: der Twist existiert nur bei
// Automat 1) — direkter Einstieg über die HallScene.
//
// Score-Formel/Upgrade-Liste/Run-Ende wurden vor der Umsetzung mit dem
// Nutzer abgestimmt (kein expliziter Wert dafür in SPECIFICATION.md,
// Abschnitt 7 nennt nur Genre/Skill-Mechanik/Ressource).

export const BASIS_PUNKTE = 8;

// Zielgenauigkeits-Bonus: Trefferserie ohne Fehlschuss erhöht den Bonus
// (Analogie zu zeit_bonus bei Automat 1, aber Serie statt Reaktionszeit als
// Zielgenauigkeits-Signal). Serie resettet bei jedem Fehlschuss.
export const SERIEN_BONUS_PRO_TREFFER = 0.1;
export const SERIEN_BONUS_MIN = 1;
export const SERIEN_BONUS_MAX = 2.5;

export const WELLEN_BONUS = 20; // pro vollständig geklärter Welle

// Run-Ende-Bedingungen: Leben aufgebraucht ODER Wellen-Deckel erreicht ODER
// Hard-Timeout — je nachdem, was zuerst eintritt (siehe ShooterScene).
export const START_LEBEN = 3;
export const WELLEN_DECKEL = 5;
export const HARD_TIMEOUT_MS = 90_000;

// Spezifikationslücke (wie bei Automat 1): Wellen-Aufbau nicht beziffert.
// Sinnvolle Annahme fürs erste Playtesting, kein final kalibrierter Wert.
export const INVADER_COLS = 6;
export const INVADER_ROWS = 4;
export const INVADER_BASE_SPEED_PX_PER_S = 40;
export const INVADER_SPEED_INCREASE_PER_WAVE_PX_PER_S = 12;
export const INVADER_FIRE_INTERVAL_START_MS = 1400;
export const INVADER_FIRE_INTERVAL_MIN_MS = 500;
export const INVADER_FIRE_INTERVAL_DECREASE_PER_WAVE_MS = 150;

export const CANNON_COOLDOWN_MS = 350;
export const PROJECTILE_SPEED_PX_PER_S = 480;
export const HIT_RADIUS_PX = 18;

// Upgrades (Kostenformel `basis × wachstum^level`, bewusst identisch zu den
// Automat-1-Werten aus SPECIFICATION.md Abschnitt 4a übernommen — Aktiv-vor-
// Passiv-Prinzip gilt genreübergreifend gleich, nur die Effekte sind
// themenpassend andere).
export const SCHNELLFEUER_COST_BASIS = 10;
export const SCHNELLFEUER_COST_WACHSTUM = 1.15;
export const SCHNELLFEUER_COOLDOWN_REDUKTION_MS_PRO_LEVEL = 25;
export const SCHNELLFEUER_COOLDOWN_MIN_MS = 100;

export const BREITERER_KANONENKOPF_COST_BASIS = 15;
export const BREITERER_KANONENKOPF_COST_WACHSTUM = 1.15;
export const BREITERER_KANONENKOPF_RADIUS_PX_PRO_LEVEL = 4;

export const SCORE_MULTIPLIKATOR_COST_BASIS = 20;
export const SCORE_MULTIPLIKATOR_COST_WACHSTUM = 1.2;
export const SCORE_MULTIPLIKATOR_PRO_LEVEL = 0.1; // +10 % pro Stufe

export const VERSTAERKTER_RUMPF_COST_BASIS = 25;
export const VERSTAERKTER_RUMPF_COST_WACHSTUM = 1.25;
export const VERSTAERKTER_RUMPF_LEBEN_PRO_LEVEL = 1;
export const VERSTAERKTER_RUMPF_MAX_LEVEL = 3;
