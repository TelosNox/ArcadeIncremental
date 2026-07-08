// Einzige Quelle für Balance-Konstanten (CLAUDE.md, Architektur-Regel 2).
// Werte referenzieren die jeweiligen Abschnitte in DOCS/SPECIFICATION.md.

// Abschnitt 5: Offline-Progress-Cap für passive_rate-Gutschriften.
export const OFFLINE_PROGRESS_CAP_MS = 8 * 60 * 60 * 1000;

// Abschnitt 4a: Score-zu-Credits-Umrechnung (Automat 1, laut Spezifikation
// explizit hier statt in der Automaten-config.ts verortet).
export const SCORE_TO_CREDITS_DIVISOR = 5;

// Score-zu-Credits-Umrechnung für Automat 2 (Abschnitt 7, mit dem Nutzer vor
// der Umsetzung abgestimmt, Phase 5). Gleicher Wert wie Automat 1: ein guter
// Run landet bei ähnlicher Score-Größenordnung (~300-450), damit sich die
// Hallen-Credits-Erträge zwischen den Automaten nicht sofort verzerren.
export const MACHINE02_SCORE_TO_CREDITS_DIVISOR = 5;

// --- Hallen-Layer (DOCS/IMPLEMENTATION_PLAN.md Phase 4) ---

// Abschnitt 6: Freischaltkosten(n) = 50 × 3^(n-1), exakt aus der Tabelle.
export const HALL_UNLOCK_COST_BASIS = 50;
export const HALL_UNLOCK_COST_GROWTH = 3;

// Abschnitt 7: acht Automaten-Konzepte insgesamt.
export const TOTAL_MACHINE_COUNT = 8;

// Abschnitt 3/6: "Hallen-Credits, gespeist aus allen aktiven Automaten
// gemeinsam" — keine konkrete Umrechnungsformel vorgegeben.
// Spezifikationslücke: sinnvolle Annahme, dass ein fester Anteil jeder
// gutgeschriebenen Automaten-Ressource zusätzlich als Hallen-Credits
// gutgeschrieben wird (statt eines eigenen Ertrags). Gilt maschinenunabhängig,
// damit Automat 2+ (Phase 5/6) ohne weitere Architektur-Änderung mit
// aggregiert wird. TODO: Phase 7 Balancing-Pass gegen die Freischaltkosten-
// Kurve oben kalibrieren.
export const HALL_CREDITS_SHARE_OF_MACHINE_CURRENCY = 0.2;

// Hallen-weite Upgrades (Abschnitt 6: "Hallen-Credits kaufen Hallen-weite
// Upgrades") — Spezifikationslücke: kein konkreter Katalog vorgegeben.
// Sinnvolle Annahme: zwei Upgrades, die direkt an bereits in dieser Phase
// eingeführten Hallen-Mechaniken ansetzen (Aggregations-Anteil, Freischalt-
// kosten) statt an automatenspezifischen Werten — bleibt dadurch unabhängig
// davon, wie viele Automaten aktiv sind.
export const HALLEN_SAMMLER_COST_BASIS = 100;
export const HALLEN_SAMMLER_COST_WACHSTUM = 1.3;
export const HALLEN_SAMMLER_SHARE_BONUS_PER_LEVEL = 0.1; // +10 % Hallen-Credits-Ertrag pro Stufe

export const AUTOMATEN_RABATT_COST_BASIS = 150;
export const AUTOMATEN_RABATT_COST_WACHSTUM = 1.35;
export const AUTOMATEN_RABATT_REDUKTION_PRO_LEVEL = 0.05; // -5 % Freischaltkosten pro Stufe
export const AUTOMATEN_RABATT_MIN_MULTIPLIKATOR = 0.5; // Floor, damit der Rabatt nie auf 0 fällt
export const AUTOMATEN_RABATT_MAX_LEVEL = 10; // Floor exakt bei Stufe 10 erreicht

// Support-Boosts für den aktuell aktiv gespielten Automaten (Abschnitt 6:
// Trainer / Slow-Motion-Charge-Extra-Leben / Kopfstart). Spezifikationslücke:
// weder Kosten noch Effektstärke beziffert. Sinnvolle Annahme, schwächer pro
// Stufe als das äquivalente lokale Upgrade (Score-Multiplikator +10 %/Stufe),
// da Support-Boosts zusätzlich zu lokalen Upgrades wirken.
export const TRAINER_COST_BASIS = 30;
export const TRAINER_COST_WACHSTUM = 1.2;
export const TRAINER_SCORE_BONUS_PRO_LEVEL = 0.05; // +5 % Score-Multiplikator pro Stufe

// "Slow-Motion-Charge / Extra-Leben" wirkt proaktiv statt reaktiv (Strafpunkte
// wurden komplett entfernt, siehe DOCS/SPECIFICATION.md "Keine Strafpunkte"):
// bei Automat 1 längere Mole-Sichtbarkeit, bei Automat 2 zusätzliche Leben
// (siehe machine01-whackamole/upgrades.ts bzw. machine02-shooter/upgrades.ts).
export const SLOW_MOTION_COST_BASIS = 40;
export const SLOW_MOTION_COST_WACHSTUM = 1.3;
export const SLOW_MOTION_MAX_LEVEL = 5;

export const KOPFSTART_COST_BASIS = 35;
export const KOPFSTART_COST_WACHSTUM = 1.25;
export const KOPFSTART_BASE_SCORE_PRO_LEVEL = 5;
export const KOPFSTART_MAX_LEVEL = 10; // Deckel, damit der Run-Score nicht schon vor dem ersten Treffer den Break dominiert
