# Implementierungsplan: Incremental Arcade Hall

## Tech-Stack

- **Build**: Vite + TypeScript (strict mode)
- **Arcade-Rendering**: Phaser 3
- **Big Numbers**: `break_infinity.js`
- **State Management**: eigener, schlanker Pub/Sub-Store (kein Redux/MobX
  nötig für diesen Scope)
- **Tests**: Vitest (Fokus auf Formeln/Balance-Logik, nicht auf Phaser-Scenes)
- **Deployment**: GitHub Pages via GitHub Actions

## Projektstruktur

```
incremental-arcade/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── CLAUDE.md
├── .github/workflows/deploy.yml
├── public/assets/
├── src/
│   ├── main.ts
│   ├── core/
│   │   ├── GameLoop.ts
│   │   ├── BigNumber.ts
│   │   ├── ResourceEngine.ts
│   │   └── OfflineProgress.ts
│   ├── state/
│   │   ├── GameState.ts
│   │   ├── StateStore.ts
│   │   ├── events.ts
│   │   └── selectors.ts
│   ├── persistence/
│   │   ├── SaveManager.ts
│   │   └── schema.ts
│   ├── arcade/
│   │   ├── PhaserBridge.ts
│   │   ├── machines/
│   │   │   ├── machine01-whackamole/
│   │   │   │   ├── WhackAMoleScene.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── assets.ts
│   │   │   ├── machine02-shooter/
│   │   │   ├── machine03-breakout/
│   │   │   ├── machine04-rhythm/
│   │   │   ├── machine05-runner/
│   │   │   ├── machine06-match3/
│   │   │   ├── machine07-claw/
│   │   │   └── machine08-pinball/
│   │   └── shared/
│   │       ├── ArcadeSceneBase.ts
│   │       └── ScoreToCurrency.ts
│   ├── hall/
│   │   ├── HallUpgrades.ts
│   │   ├── UnlockLogic.ts
│   │   └── SupportBoosts.ts
│   ├── ui/
│   │   ├── HUD.ts
│   │   ├── UpgradePanel.ts
│   │   └── RevealSequence.ts
│   └── config/
│       └── balance.ts
├── tests/core/
└── README.md
```

`config/balance.ts` ist die **einzige Quelle** für Balance-Konstanten
(`S_max`, `S_break`, `k_avg`, `passive_rate`-Faktor, Freischaltkosten-Formel
etc.) — keine Magic Numbers verstreut im Code.

## Phasen

### Phase 0 — Projekt-Setup
- Vite + TS Grundgerüst, Ordnerstruktur wie oben
- Phaser 3 und `break_infinity.js` als Dependencies einbinden
- `vite.config.ts`: `base: './'` (relativer Pfad, unabhängig vom Repo-Namen,
  kein Abgleich nötig)
- GitHub Actions Workflow (`.github/workflows/deploy.yml`), offizielle
  GitHub-Pages-Actions statt `gh-pages`-Branch-Hack:
  `actions/checkout` → `actions/setup-node` (Node 20 LTS) → `npm ci` →
  `npm run build` → `actions/upload-pages-artifact` (Pfad `dist/`) →
  `actions/deploy-pages`. Trigger: `push` auf `main`.
- Leere Szene rendert sich sichtbar über GitHub Pages (Smoke-Test für die
  Deployment-Pipeline, bevor irgendeine Spiellogik existiert)

### Phase 1 — Idle-Kern & State Store (Fundament)
- `GameLoop` mit Delta-Time-Tick
- `StateStore` mit typisiertem Event-Bus (`events.ts`)
- `BigNumber`-Wrapper
- `SaveManager` mit `localStorage`, Versionierung, Offline-Progress-Stub
  (Cap: 8h, siehe `SPECIFICATION.md` Abschnitt 5)
- Save-Schema: `{ version: number, savedAt: number, state: GameState }`.
  Migrationen als Array von Funktionen, indiziert nach Ausgangsversion:
  `migrations[fromVersion](oldState) => newState`, sequenziell angewendet
  bis `version === CURRENT_VERSION`. Ist die geladene Version **neuer** als
  bekannt: Laden verweigern, alten Save-Blob unter separatem Key als Backup
  behalten, Spieler informieren — nie stillschweigend zurücksetzen. Ist sie
  **älter** und keine passende Migration vorhanden: Reset mit expliziter
  Warnung, nie stiller Datenverlust.
- Unit-Tests für Tick-Mathematik und Speichern/Laden (inkl. Migrationspfade)

### Phase 2 — Automat 1: Whac-a-Mole (Blind-Phase)
- `WhackAMoleScene` als Phaser-Scene
- Score-Berechnung aus Reaktionszeit/Treffern
- Run-Ende → Event an Store → Credits-Umrechnung → lokale Upgrades
- Upgrade-Panel (UI) zwischen den Runs

### Phase 3 — Break/Reveal-Mechanik
- Schwellenwert-Formel aus Spezifikation Abschnitt 4 implementieren
- `RevealSequence` (einmalige Cutscene/Übergang)
- Nach Reveal: passive Automatisierung (`passive_rate`-Formel) aktivieren
- Effizienz-Anzeige (X % vom Maximum)

### Phase 4 — Hallen-Layer
- `HallUpgrades`, `UnlockLogic` (Freischaltkosten-Formel)
- `SupportBoosts` für den aktuell aktiven Automaten
- Hallen-Credits-Aggregation aus allen aktiven Automaten

### Phase 5 — Automat 2: Shooter (Referenz-Template für "bereits enthüllte" Automaten)
- Kein Blind/Reveal-Twist mehr — direkter Einstieg
- Validiert, dass `ArcadeSceneBase` und `ScoreToCurrency` generisch genug
  sind, um ein zweites Genre ohne Architektur-Änderungen zu tragen

### Phase 6 — Automaten 3–8 (Content-Skalierung)
- Wiederholung des in Phase 5 etablierten Patterns pro Genre
- Pro Automat: eigene Balance-Konstanten in `config/balance.ts`, eigene
  Scene, kein neuer Architektur-Code nötig
- Laufende Anpassung der Run-Dauer pro Genre (siehe Spezifikation Abschnitt 9)

### Phase 7 — Polish & Balancing-Pass
- Offline-Progress vollständig implementieren und testen
- Balance-Feintuning anhand von Playtesting-Daten (`k_avg`, Clamp-Grenzen)
- Deployment-Härtung (Cache-Busting, Fehlerbehandlung beim Laden korrupter Saves)

## Reihenfolge-Prinzip

Jede Phase muss für sich spielbar/testbar sein, bevor die nächste beginnt.
Phase 2 ist der wichtigste Meilenstein: sie beweist die komplette Bridge
zwischen Arcade-Ebene und Idle-Kern an einem einzigen, einfachen Beispiel.
Alles danach ist Wiederholung desselben Patterns mit neuem Content.
