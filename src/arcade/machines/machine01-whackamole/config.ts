// Automat 1 (Whac-a-Mole) — automatenspezifische Werte aus SPECIFICATION.md
// Abschnitt 4a.

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

// Upgrades (Abschnitt 4a, Kostenformel `basis × wachstum^level` exakt aus
// der Tabelle). Nur "Verlängerte Runde" hat ein Level-Limit.
export const SCHNELLERE_REFLEXE_COST_BASIS = 10;
export const SCHNELLERE_REFLEXE_COST_WACHSTUM = 1.15;
// Spezifikationslücke: Effektstärke pro Level nicht beziffert ("vergrößert
// Zeitfenster für hohen zeit_bonus"). Sinnvolle Annahme: verschiebt die
// zeit_bonus-Referenzzeit nach oben, macht denselben Reaktionswert wertvoller.
export const SCHNELLERE_REFLEXE_MS_PER_LEVEL = 50;

export const GROESSERER_HAMMER_COST_BASIS = 15;
export const GROESSERER_HAMMER_COST_WACHSTUM = 1.15;
// Spezifikationslücke: Effektstärke pro Level nicht beziffert ("größerer
// Trefferradius, weniger Fehlklicks"). Wirkt nur auf die Klick-Erkennung,
// nicht auf die Optik der Mole (kein finaler Asset-Anspruch, Abschnitt 11).
export const GROESSERER_HAMMER_RADIUS_PX_PER_LEVEL = 8;

export const SCORE_MULTIPLIKATOR_COST_BASIS = 20;
export const SCORE_MULTIPLIKATOR_COST_WACHSTUM = 1.2;
export const SCORE_MULTIPLIKATOR_PER_LEVEL = 0.1; // +10 % pro Stufe (exakt, Abschnitt 4a)

export const VERLAENGERTE_RUNDE_COST_BASIS = 25;
export const VERLAENGERTE_RUNDE_COST_WACHSTUM = 1.25;
export const VERLAENGERTE_RUNDE_MS_PER_LEVEL = 5_000; // +5s pro Stufe (exakt, Abschnitt 4a)
export const VERLAENGERTE_RUNDE_MAX_LEVEL = 3; // max. 3 Stufen (exakt, Abschnitt 4a)

export const FEHLERVERZEIHUNG_COST_BASIS = 12;
export const FEHLERVERZEIHUNG_COST_WACHSTUM = 1.15;
// Spezifikationslücke: Effektstärke/Untergrenze nicht beziffert ("reduziert
// strafe pro Fehlklick"). Sinnvolle Annahme mit Floor, damit strafe nie auf 0
// oder negativ fällt (sonst würden Fehlklicks irgendwann belohnt).
export const FEHLERVERZEIHUNG_STRAFE_REDUKTION_PRO_LEVEL = 1;
export const FEHLERVERZEIHUNG_STRAFE_MIN = 1;

// Break-Bedingung (Abschnitt 4) — exklusiv Automat 1 (Abschnitt 1: der
// Blind/Reveal-Twist existiert nur hier), deshalb hier statt in der
// geteilten config/balance.ts.
export const S_MAX = 150;
export const S_BREAK = 100;
// TODO: k_avg war implizit auf 60s-Runs kalibriert (siehe RUN_DURATION_MS-
// Kommentar oben) — bewusst unverändert bis zum Balancing-Pass (Phase 7),
// nicht jetzt blind neu schätzen (SPECIFICATION.md Abschnitt 4a, Hinweis).
export const K_AVG = 9.1;
export const SKILL_MULTIPLIER_MIN = 0.5; // exakt, Abschnitt 4 ("nach unten geclampt")
// Spezifikationslücke: `m` ist in Abschnitt 4 nur narrativ beschrieben, keine
// exakte Formel. Sinnvolle Annahme: m = durchschnittsScore / Baseline. Der
// Baseline-Wert ist ein Platzhalter (wie k_avg ein Phase-7-Kalibrierungs-
// kandidat), nicht aus echten Spieldaten hergeleitet.
export const BASELINE_AVERAGE_SCORE_PER_RUN = 40;
