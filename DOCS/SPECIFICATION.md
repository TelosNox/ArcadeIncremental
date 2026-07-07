# Spezifikation: Incremental Arcade Hall

## 1. Vision

Der Spieler startet in einem einzelnen Arcade-Automaten (Whac-a-Mole) und
glaubt zunächst, ein gewöhnliches Skill-basiertes Arcade-Game zu spielen, bei
dem er zwischen Runs Credits in Upgrades investiert. Sobald sein Score eine
Schwelle erreicht, "bricht" das Spiel und offenbart: er befindet sich in
einer großen Spielhalle. Ab diesem Zeitpunkt läuft der Automat automatisiert
weiter (schwächer als aktives Spiel), während der Spieler neue Automaten mit
jeweils anderen Arcade-Genres freischaltet. Jeder neue Automat bringt eine
eigene Ressource, eigene Upgrades und trägt über eine gemeinsame
Meta-Währung ("Hallen-Credits") zum Fortschritt aller anderen Automaten bei.

Der Blind/Reveal-Twist existiert **nur bei Automat 1**. Ab Automat 2 ist dem
Spieler bereits klar, dass er in einer Spielhalle ist — neue Automaten fühlen
sich wie "neuer Bereich freigeschaltet" an, nicht wie eine neue Enthüllung.

## 2. Architektur (Referenz)

Der Client läuft vollständig im Browser, kein Backend. Vier entkoppelte
Komponenten, verbunden über einen zentralen State Store:

- **Idle-Kern** (`src/core`): Tick-Loop (rAF + Delta-Time), Ressourcen-
  Mathematik, Big-Number-Handling (`break_infinity.js`).
- **Arcade-Ebene** (`src/arcade`, Phaser 3): eine Scene pro Automat, liefert
  Ergebnis-Events (Score, Dauer, Genauigkeit) an den Store.
- **Zentraler State Store** (`src/state`): Single Source of Truth,
  Pub/Sub-Eventbus. Idle-Kern und Arcade-Ebene kennen sich nicht direkt,
  nur über den Store.
- **Persistenz** (`src/persistence`): `localStorage`, Speichern des
  vollständigen State + Timestamp, Offline-Progress-Berechnung beim Laden.

Zusätzlich: **Hallen-Layer** (`src/hall`) als Konsument des State Store für
Meta-Progression (Freischaltungen, Support-Boosts).

Detaillierte Ordnerstruktur siehe `IMPLEMENTATION_PLAN.md`.

## 3. Ressourcen-Modell (dreistufig)

1. **Run-Score**: direktes Skill-Ergebnis eines einzelnen Arcade-Runs.
   Verfällt nicht, ist aber pro Run neu zu erspielen.
2. **Automaten-Ressource** (z. B. "Reflex-Punkte" bei Automat 1):
   akkumuliert aus Run-Scores, kauft lokale Upgrades. Nach dem Break/nach
   Freischaltung wird sie zusätzlich passiv generiert.
3. **Hallen-Credits**: Meta-Ressource, gespeist aus allen aktiven Automaten
   gemeinsam. Kauft Hallen-weite Upgrades, schaltet neue Automaten frei und
   finanziert Support-Boosts für den aktuell aktiv gespielten Automaten.

## 4. Break-Bedingung (nur Automat 1)

Kein fixer Run-Counter — ein **absoluter Score-Schwellenwert**, der je nach
Skill unterschiedlich schnell erreicht wird.

```
score(n) = S_max × (1 − e^(−n / k))
k = k_avg / skill_multiplier (m)
S_max = 150       # theoretisches Score-Maximum bei vollem lokalem Upgrade-Baum
S_break = 100     # fixer Trigger-Wert: score(n) ≥ S_break löst den Break aus
k_avg = 9.1       # kalibriert für m = 1 (Durchschnittsspieler)
```

`m` (skill_multiplier) ist kein künstlicher Wert, sondern ergibt sich direkt
aus der tatsächlichen Spielleistung: höherer Score pro Run → mehr Credits →
schnellerer Upgrade-Kauf → kleineres `k`. Keine Sonderfall-Logik, dieselbe
Formel für alle Spieler.

Kalibrierungs-Zielwerte (aus Playtesting abzugleichen):

| Spielertyp | m | Run bei Break |
|---|---|---|
| Guter Spieler | 2.0 | ~5 |
| Durchschnitt | 1.0 | ~10 |
| Schwacher Spieler | 0.5 (unterer Clamp) | ~20 |

**Wichtig:** `m` wird nach unten auf 0.5 geclampt, damit auch sehr schwache
Spieler garantiert nicht mehr als das Doppelte der Durchschnittsdauer
benötigen. Falls Playtesting zeigt, dass reale Werte darunter fallen, ist ein
kleines Mindest-Credits-pro-Run-Sicherheitsnetz einzuführen.

Da Credits nur durch aktives Spielen entstehen, kann die Schwelle durch
Nichtstun nie erreicht werden — es gibt keinen Idle-Pfad zum Break.

**Anomalie-Hinweis:** Damit der Spieler merkt, dass "etwas Größeres" im
Gange ist, ohne den Twist vorwegzunehmen, zeigt die Oberfläche einen
unbeschrifteten, rein visuellen Fortschritts-Indikator (kein Text, keine
Zahl, kein Tooltip), der mit `score(n)/S_break` mitwächst — er verändert
Farbe und Pulsfrequenz, verrät aber nicht, wofür er steht. Verschwindet
nach dem Break, da das Rätsel dann gelöst ist. Implementiert als
`computeBreakProgress()` in `breakCondition.ts`.

## 4a. Automat 1 — konkrete Werte (Whac-a-Mole)

**Score-Formel:**
```
score = Σ (treffer_i × basis_punkte × zeit_bonus_i) − (verpasste_moles × strafe)

basis_punkte = 10
zeit_bonus   = clamp(2 − reaktionszeit_ms / 500, 0.5, 2)
strafe       = 5   // pro Mole, die despawnt, ohne getroffen zu werden
```
Run-Dauer **30s** (reduziert von ursprünglich geplanten 60s — 60s fühlte
sich im Playtesting zu lang an, Spieler verlor die Motivation), mit
steigender Mole-Erscheinungsrate im Verlauf eines Runs
(Schwierigkeits-Ramp innerhalb des Runs).

> **Hinweis:** Interaktion ist Hover statt Klick — sobald der Cursor in
> Reichweite (Basisradius + "Größerer Hammer"-Bonus) einer aktiven Mole
> ist, zählt das als Treffer (`reaktionszeit_ms` = Zeit vom Erscheinen bis
> zum ersten Erreichen der Reichweite). Grund: Ein klick-basiertes
> Treffen/Verfehlen würde ab einem gewissen Hammer-Radius keine räumliche
> Zielgenauigkeit mehr testen und das Upgrade würde Klicks komplett
> entwerten. Dadurch gibt es keinen "Fehlklick" mehr — die Strafe wird
> stattdessen fällig, wenn eine Mole ihr Sichtbarkeitsfenster verpasst
> (despawnt, ohne dass der Cursor in Reichweite kam). Das bleibt aktives
> Spielen: der Cursor muss aktiv zur richtigen von 9 Positionen bewegt
> werden.

> **Hinweis (vorläufig):** `k_avg = 9.1` in Abschnitt 4 war implizit auf
> 60s Run-Dauer kalibriert. Bei 30s halbiert sich grob die Anzahl der
> Trefferchancen pro Run, wodurch vermutlich mehr Runs bis zum Break nötig
> sind als die dort genannten ~10. Der Wert bleibt bewusst unverändert,
> bis im Balancing-Pass (Phase 7) echte Spieldaten zur Neukalibrierung
> vorliegen — nicht jetzt blind neu schätzen.

**Score-zu-Credits-Umrechnung:**
```
credits_earned = floor(score / SCORE_TO_CREDITS_DIVISOR)
SCORE_TO_CREDITS_DIVISOR = 5   // Konstante in config/balance.ts
```

**Upgrades:**

| Upgrade | Effekt | Kosten (`basis × wachstum^level`) |
|---|---|---|
| Schnellere Reflexe | vergrößert Zeitfenster für hohen `zeit_bonus` | 10 × 1.15^lvl |
| Größerer Hammer | größere Hover-Reichweite, weniger verpasste Moles | 15 × 1.15^lvl |
| Score-Multiplikator | +10 % Score pro Stufe | 20 × 1.2^lvl |
| Verlängerte Runde | +5s Run-Dauer, max. 3 Stufen | 25 × 1.25^lvl |
| Fehlerverzeihung | reduziert `strafe` pro verpasster Mole | 12 × 1.15^lvl |

**Design-Entscheidung:** Upgrades sind überwiegend **Gameplay-Upgrades**
(Trefferradius, Zeitfenster, Run-Dauer), nur der Score-Multiplikator ist ein
reiner abstrakter Hebel. Begründung: Gameplay-Upgrades machen aktives,
geschicktes Spielen leichter/lohnender statt Fortschritt von der
tatsächlichen Leistung zu entkoppeln — das stützt das
Aktiv-schlägt-passiv-Prinzip direkt auf Upgrade-Ebene.

## 5. Balance-Prinzip: aktiv schlägt passiv

Nach Reveal/Freischaltung produziert ein automatisierter Automat:

```
passive_rate = 0.15 × (best_run_score / run_dauer)
```

Nur ~15 % der Rate eines guten aktiven Runs. Aktives Spielen bleibt dem
reinen Idlen immer klar überlegen — Faulenzen liefert eine Grundversorgung,
niemals Top-Fortschritt.

**Sichtbares Maximum**: jeder Automat zeigt eine Effizienz-Anzeige
("Automaten-Effizienz: 42 % vom Maximum"), wobei 100 % dem Soft-Cap-Score
bei vollem Upgrade-Baum entspricht — für einen Durchschnittsspieler mit
realistischem Aufwand erreichbar.

**Offline-Progress-Cap**: maximal **8 Stunden** Abwesenheit werden für
`passive_rate`-Gutschriften angerechnet. Alles darüber hinaus verfällt
ungenutzt. Verhindert, dass tagelange Abwesenheit mehr Fortschritt bringt
als aktives Spielen. Feinjustierung (z. B. abnehmende statt harte Grenze)
erfolgt im Balancing-Pass (Phase 7).

## 6. Hallen-Meta-Progression

**Freischaltkosten** für Automat `n` (in Hallen-Credits):

```
Freischaltkosten(n) = 50 × 3^(n − 1)
```

| Automat | Kosten |
|---|---|
| 2 | 150 |
| 3 | 450 |
| 4 | 1.350 |
| 5 | 4.050 |
| 6 | 12.150 |
| 7 | 36.450 |
| 8 | 109.350 |

**Support-Boosts**: Hallen-Credits können gezielt in den aktuell aktiv
gespielten Automaten investiert werden:

- **Trainer**: +X % Score-Multiplikator
- **Slow-Motion-Charge / Extra-Leben**: macht einzelne Runs verzeihlicher
- **Kopfstart**: jeder neue Run startet mit kleinem Basis-Score

Support-Boosts dürfen das Erreichen des Soft-Caps **erleichtern**
(schnellerer Weg, geringere benötigte Run-Zahl), aber niemals Score direkt
schenken — das Prinzip "aktives Spielen ist erforderlich" bleibt in jeder
Phase gültig, auch für bereits automatisierte Altautomaten (sie finanzieren
den aktuellen Fortschritt, statt nutzlos im Hintergrund zu laufen).

## 7. Die 8 Automaten-Konzepte

| # | Genre | Skill-Mechanik | Ressource |
|---|---|---|---|
| 1 | Whac-a-Mole / Reflex-Tester | Reaktionsgeschwindigkeit | Reflex-Punkte |
| 2 | Space-Invaders-Shooter | Zielgenauigkeit, Wellen überleben | Abschüsse |
| 3 | Arkanoid / Breakout | Ballphysik, Präzision | Ziegel |
| 4 | Rhythmus-Spiel (DDR-Stil) | Timing, Combos | Combo-Punkte |
| 5 | Endless Runner | Ausdauer, Reaktionsfenster | Distanz |
| 6 | Match-3-Puzzle | Mustererkennung | Matches |
| 7 | Greifautomat (Claw Machine) | Timing + Risiko | Preise |
| 8 | Pinball | Physik + Kombination aller Skills | Punkte |

Bewusste Reihenfolge: reiner Reflex (1–2) → Physik/Timing (3–4) →
Ausdauer/Strategie (5–6) → Risiko (7) → Finale, das alle Skills kombiniert (8).

## 8. Wachstum zwischen Automaten

Innerhalb eines Automaten: schnelles Wachstum, das abflacht (Sättigungskurve,
siehe Abschnitt 4). Zwischen Automaten: exponentiell steigende
Freischaltkosten (Abschnitt 6). Diese Doppelstruktur erzeugt den typischen
Incremental-Charakter, ohne dass ein einzelner Automat beliebig weiter
wächst.

## 9. Zeit-Budget

- Automat 1: Run-Dauer 30s (siehe Abschnitt 4a), Run-Zahl bis Break noch
  nicht neu vermessen (ursprüngliche Kalibrierung ~10 Runs bezog sich auf
  60s-Runs) — wird im Playtesting beobachtet und in Phase 7 nachkalibriert.
  Danach Hallen-Upgrades/Freischaltung ≈ 10–15 Min. Gesamtzeit pro Stufe
  hängt an der noch ausstehenden Nachkalibrierung, Ziel bleibt ≤ 30 Min.
- Automaten 2–8: Run-Dauer darf ansteigen (mehr Komplexität pro Genre),
  Ziel bleibt ≤ 30 Min pro Stufe. Feinjustierung erfolgt pro Automat separat,
  nicht durch reines Hochskalieren der Zahlen.

## 10. UI-Interaktion (Automat 1, gilt als Muster für weitere Automaten)

**Layout:** Phaser-Canvas (800×600) zentriert, darüber eine schlanke,
immer sichtbare HUD-Leiste (DOM, kein Phaser). Das Upgrade-Panel ist kein
eigener Screen, sondern ein Overlay, das zwischen den Runs über den Canvas
gleitet — kein Page-Wechsel, alles bleibt auf einem Bildschirm.

**UI-State-Machine** (getrennt vom Spielzustand im Store, z. B. als Enum in
`ui/UIState.ts`):

- **Idle** — vor Rundenstart, "Start"-Button über dem Canvas
- **Playing** — Run läuft, nur minimales HUD sichtbar (Live-Score, Timer)
- **RunResult** — Run beendet, Overlay zeigt Score + gutgeschriebene Credits
- **Upgrade** — Upgrade-Panel sichtbar, "Weiterspielen" führt zurück zu Idle
- **Reveal** — Sonderzustand (einmalig), überlagert alles andere

**HUD-Inhalt:** immer sichtbar: aktuelle Automaten-Ressource, Hallen-Credits
(sobald freigeschaltet). Nur im Zustand *Playing* zusätzlich: Live-Score,
Countdown-Timer. Bewusst schlank — Effizienz-Anzeige und Hallen-Details
gehören ins Upgrade-Panel bzw. eine spätere Hallen-Übersicht, nicht ins HUD.

**Upgrade-Panel:** Karten-Liste (eine Karte pro Upgrade: Name, Level,
Effektbeschreibung, Kosten). Direkter Klick-Kauf ohne Bestätigungsdialog.
Nicht leistbare Upgrades: Button ausgegraut, Preis in gedämpfter statt
roter Farbe (kein Fehlerzustand, nur "noch nicht genug Credits"). Nach Kauf:
sofortiges optimistisches UI-Update, kein Ladezustand nötig.

## 11. Nicht-Ziele (v1)

- Kein Mehrspieler, kein Server-Backend, kein Login.
- Kein Sound-Design / keine finalen Assets (Platzhalter-Grafiken reichen für
  die ersten Phasen).
- Keine mobile Touch-Optimierung im ersten Durchstich (Desktop/Maus/Tastatur
  zuerst, Touch-Layer folgt später).
