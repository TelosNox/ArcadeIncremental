# Projektanweisungen für Claude Code

Dieses Projekt ist ein browserbasiertes Incremental Game ("Incremental
Arcade Hall"). Vollständige Spielspezifikation: `DOCS/SPECIFICATION.md`.
Phasenplan: `DOCS/IMPLEMENTATION_PLAN.md`. Beide vor größeren Änderungen
lesen.

## Tech-Stack (verbindlich, nicht ohne Rücksprache wechseln)

- TypeScript (strict mode), Vite als Build-Tool
- Phaser 3 für alle Arcade-Mini-Games
- `break_infinity.js` **durchgängig** für alle Ressourcen- und
  Fortschrittszahlen im Spiel (Run-Score, Automaten-Ressourcen,
  Hallen-Credits) — keine Unterscheidung zwischen "klein genug für native
  number" und "braucht BigNumber". Einheitliche Regel, keine spätere
  Typ-Migration nötig. (Reine UI-/Technik-Werte wie Pixel-Koordinaten,
  Timestamps oder Level-Indizes sind davon selbstverständlich ausgenommen.)
- Kein UI-Framework (React/Vue) — Overlay-UI ist plain DOM/TS
- Kein Backend, keine externe API, keine Login-Logik

## Architektur-Regeln

1. **Idle-Kern und Arcade-Ebene sprechen nie direkt miteinander.** Jede
   Kommunikation läuft über den `StateStore` (Events aus `state/events.ts`).
   Wenn eine Phaser-Scene direkt auf `GameState` schreiben will, ist das ein
   Architekturbruch — stattdessen ein Event emittieren.
2. **Alle Balance-Konstanten gehören in `src/config/balance.ts`.** Keine
   Magic Numbers (Kosten, Multiplikatoren, Schwellenwerte) direkt in Scenes
   oder im Store verstreuen.
3. **Jeder Automat ist eine eigene Phaser-Scene** unter
   `src/arcade/machines/machineNN-<name>/`, mit eigener `config.ts` für
   automatenspezifische Werte. Gemeinsame Logik gehört in
   `src/arcade/shared/`.
4. **Aktiv-vor-Passiv-Prinzip ist nicht verhandelbar.** Jede neue Mechanik
   (Upgrade, Support-Boost, Automation) muss geprüft werden: kann sie
   reinem Nichtstun mehr Fortschritt geben als der in der Spezifikation
   festgelegte `passive_rate`-Faktor? Falls ja, nicht so implementieren.
5. **Persistenz ist versioniert.** Änderungen am Save-Schema
   (`persistence/schema.ts`) brauchen eine Migration, kein stillschweigendes
   Brechen alter Spielstände.

## Code-Stil

- Strict TypeScript, keine `any` ohne Kommentar-Begründung
- Kleine, fokussierte Module statt großer Dateien — Scenes sollten primär
  Rendering/Input orchestrieren, nicht Balance-Formeln enthalten
- Benennung: Klassen `PascalCase`, Dateien nach ihrer Hauptklasse benannt
- Neue Formeln (Score-, Wachstums-, Kostenberechnungen) immer mit einem
  kurzen Kommentar, der auf den entsprechenden Abschnitt in
  `DOCS/SPECIFICATION.md` verweist
- Punkte-/Ressourcenwerte (Score, Automaten-Ressourcen, Hallen-Credits)
  werden ganzzahlig gerechnet und angezeigt: Formeln runden auf eine
  Ganzzahl, spätestens bevor der Wert in den Store geschrieben wird. Für
  die Anzeige im UI immer `formatNumber()` (`src/ui/formatNumber.ts`)
  verwenden statt rohem `toString()` auf `Decimal`-Werten — verhindert
  Fließkomma-Reste in der Anzeige bei jedem neuen Automaten

## Tests

- Vitest für alles in `src/core`, `src/state`, `src/hall`, `src/config`
  (reine Logik/Formeln — hier zählt Korrektheit besonders)
- Keine Tests für Phaser-Rendering selbst nötig, aber Score-Berechnungs-
  Funktionen innerhalb einer Scene sollten aus der Scene extrahiert und
  testbar sein (nicht direkt an `this.` in der Scene-Klasse hängen)

## Git & Deployment

- Commits klein und beschreibend halten, pro Phase aus dem
  Implementierungsplan mehrere Commits statt einem Monolithen
- Der `main`-Branch muss immer über GitHub Pages deploybar sein — kein
  kaputter Build committen
- Deployment läuft über `.github/workflows/deploy.yml` (GitHub Actions),
  nicht manuell über einen `gh-pages`-Branch pushen

## Bei Unklarheiten

Wenn eine Spezifikationslücke auffällt (z. B. ein noch nicht festgelegter
Balance-Wert für Automat 3–8), im Zweifel eine sinnvolle Annahme treffen,
sie als Kommentar/TODO im Code markieren und im Antworttext kurz benennen —
nicht stillschweigend raten.
