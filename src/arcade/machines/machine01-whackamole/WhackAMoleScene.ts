import Phaser from 'phaser';
import { SCORE_TO_CREDITS_DIVISOR } from '../../../config/balance';
import { Decimal, ZERO } from '../../../core/BigNumber';
import type { ArcadeBridge } from '../../PhaserBridge';
import { ArcadeSceneChrome } from '../../shared/ArcadeSceneBase';
import { scoreToCredits } from '../../shared/ScoreToCurrency';
import { formatNumber } from '../../../ui/formatNumber';
import type { UIState, UIStateController } from '../../../ui/UIState';
import { computeBreakProgress, hasReachedBreak } from './breakCondition';
import {
  ANOMALY_BAR_HEIGHT,
  ANOMALY_BAR_WIDTH,
  ANOMALY_COLOR_HIGH,
  ANOMALY_COLOR_LOW,
  ANOMALY_PULSE_DURATION_MAX_MS,
  ANOMALY_PULSE_DURATION_MIN_MS,
  FEEDBACK_RISE_DISTANCE_PX,
  HIT_FEEDBACK_DURATION_MS,
  HOLE_COUNT,
  MISS_COLOR,
  MISS_FEEDBACK_DURATION_MS,
  MISS_FLASH_DURATION_MS,
  MOLE_SPAWN_INTERVAL_END_MS,
  MOLE_SPAWN_INTERVAL_START_MS,
  NORMAL_HIT_COLOR,
  PERFECT_HIT_COLOR,
  PERFEKT_ZEIT_BONUS_THRESHOLD,
  PUNCH_TWEEN_DURATION_MS,
} from './config';
import { applyHit, computeHitScore, computeZeitBonus } from './scoring';
import { computeEffectiveParams, type EffectiveMachine01Params } from './upgrades';

// Reine Layout-Werte fürs Platzhalter-Grid, keine Balance-Konstanten
// (Nicht-Ziele, SPECIFICATION.md Abschnitt 11: keine finalen Assets nötig).
const GRID_COLUMNS = 3;
const HOLE_RADIUS = 55;
const HOLE_SPACING = 180;
const GRID_CENTER_X = 400;
const GRID_CENTER_Y = 300;

interface HoleView {
  x: number;
  y: number;
  background: Phaser.GameObjects.Arc;
  mole: Phaser.GameObjects.Arc;
  moleShownAt: number | null;
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export class WhackAMoleScene extends Phaser.Scene {
  private readonly bridge: ArcadeBridge;
  private readonly uiState: UIStateController;
  private readonly openUpgrades: () => void;

  private holes: HoleView[] = [];
  private score: Decimal = ZERO;
  private hits = 0;
  private misses = 0;
  private remainingMs = 0;
  private nextSpawnAt = 0;
  private effectiveParams: EffectiveMachine01Params | null = null;

  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private chrome!: ArcadeSceneChrome;
  private anomalyBar!: Phaser.GameObjects.Rectangle;
  private anomalyPulseTween: Phaser.Tweens.Tween | null = null;

  constructor(bridge: ArcadeBridge, uiState: UIStateController, openUpgrades: () => void) {
    super('WhackAMoleScene');
    this.bridge = bridge;
    this.uiState = uiState;
    this.openUpgrades = openUpgrades;
  }

  create(): void {
    const rows = Math.ceil(HOLE_COUNT / GRID_COLUMNS);
    const originX = GRID_CENTER_X - ((GRID_COLUMNS - 1) * HOLE_SPACING) / 2;
    const originY = GRID_CENTER_Y - ((rows - 1) * HOLE_SPACING) / 2;

    for (let i = 0; i < HOLE_COUNT; i++) {
      const col = i % GRID_COLUMNS;
      const row = Math.floor(i / GRID_COLUMNS);
      const x = originX + col * HOLE_SPACING;
      const y = originY + row * HOLE_SPACING;

      const background = this.add.circle(x, y, HOLE_RADIUS, 0x3a2d1a).setStrokeStyle(4, 0x1a1208);
      const mole = this.add.circle(x, y, HOLE_RADIUS * 0.75, 0x8b5a2b).setVisible(false);

      this.holes.push({ x, y, background, mole, moleShownAt: null });
    }

    this.statusText = this.add.text(20, 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });

    this.promptText = this.add
      .text(GRID_CENTER_X, 560, 'Maus über eine Mole bewegen zum Treffen\nKlicken zum Starten', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffff88',
        align: 'center',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.promptText.on('pointerdown', () => {
      const current = this.uiState.getState();
      if (current === 'idle' || current === 'runResult') {
        this.startRun();
      }
    });

    this.chrome = new ArcadeSceneChrome({
      scene: this,
      uiState: this.uiState,
      onOpenUpgrades: () => this.openUpgrades(),
    });

    const unsubscribe = this.uiState.subscribe((state) => {
      this.updateOverlayVisibility(state);
    });
    // Ohne dieses Abmelden würde jeder erneute Einstieg über die HallScene
    // (this.scene.start('WhackAMoleScene')) eine weitere Kopie dieses
    // Listeners registrieren, die noch auf die Objekte des vorigen create()-
    // Durchlaufs zeigt (von Phaser beim Scene-Shutdown bereits zerstört) —
    // das wirft beim nächsten uiState-Wechsel eine Exception.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.updateOverlayVisibility(this.uiState.getState());

    // Unbeschrifteter Anomalie-Hinweis (SPECIFICATION.md Abschnitt 1/4):
    // wächst mit computeBreakProgress(), ohne dass die Oberfläche verrät,
    // wofür er steht. Startet unsichtbar (width 0) bei progress 0.
    this.anomalyBar = this.add
      .rectangle(GRID_CENTER_X - ANOMALY_BAR_WIDTH / 2, 48, 0, ANOMALY_BAR_HEIGHT, ANOMALY_COLOR_LOW)
      .setOrigin(0, 0.5);
    this.updateAnomalyIndicator();

    this.updateStatusText();
  }

  update(_time: number, delta: number): void {
    if (this.uiState.getState() !== 'playing' || !this.effectiveParams) {
      return;
    }

    this.remainingMs -= delta;
    if (this.remainingMs <= 0) {
      this.endRun();
      return;
    }

    if (this.time.now >= this.nextSpawnAt) {
      this.spawnMole();
    }

    this.checkHoverHits();
    this.updateStatusText();
  }

  private updateOverlayVisibility(state: UIState): void {
    const showPrompt = state === 'idle' || state === 'runResult';
    this.promptText.setVisible(showPrompt);
    // Rückkehr-zur-Halle bleibt bis zum Break verborgen (SPECIFICATION.md
    // Abschnitt 1: der Blind/Reveal-Twist darf vorher nicht verraten werden)
    // — der Knopf würde sonst die Existenz der Spielhalle spoilern, bevor
    // der Spieler sie durch den Break erreicht.
    this.chrome.setVisible(showPrompt, this.bridge.getState().machine01HasBroken);
  }

  private startRun(): void {
    const state = this.bridge.getState();
    this.effectiveParams = computeEffectiveParams(state.machine01Upgrades, state.machine01SupportBoosts);

    this.uiState.setState('playing');
    // Support-Boost "Kopfstart" (hall/SupportBoosts.ts): Run beginnt mit
    // kleinem Basis-Score statt bei 0.
    this.score = new Decimal(this.effectiveParams.startScore);
    this.hits = 0;
    this.misses = 0;
    this.remainingMs = this.effectiveParams.runDurationMs;
    this.nextSpawnAt = this.time.now;

    for (const hole of this.holes) {
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
    }

    this.updateStatusText();
  }

  private endRun(): void {
    for (const hole of this.holes) {
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
    }

    const creditsEarned = scoreToCredits(this.score, SCORE_TO_CREDITS_DIVISOR);
    this.bridge.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: this.score,
      creditsEarned,
    });

    const stateAfterRun = this.bridge.getState();
    if (!stateAfterRun.machine01HasBroken && hasReachedBreak(stateAfterRun.machine01RunCount, stateAfterRun.machine01TotalScore)) {
      this.bridge.emit({ type: 'machine01BreakTriggered' });
      this.uiState.setState('reveal');
    } else {
      this.uiState.setState('runResult');
    }

    this.promptText.setText(
      `Run beendet — Score: ${formatNumber(this.score)} (${this.hits} Treffer, ${this.misses} verpasste Moles)\n` +
        `+${formatNumber(creditsEarned)} Reflex-Punkte — Klicken für neuen Run`,
    );
    this.updateAnomalyIndicator();
    this.updateStatusText();
  }

  // Unbeschrifteter Fortschritts-Hinweis (SPECIFICATION.md Abschnitt 1/4):
  // wächst und pulsiert schneller, je näher computeBreakProgress() an 1
  // kommt — kein Text, keine Zahl, die verrät, worum es geht. Verschwindet
  // nach dem Break, weil das Rätsel dann gelöst ist.
  private updateAnomalyIndicator(): void {
    const state = this.bridge.getState();
    if (state.machine01HasBroken) {
      this.anomalyBar.setVisible(false);
      this.anomalyPulseTween?.stop();
      return;
    }

    const progress = computeBreakProgress(state.machine01RunCount, state.machine01TotalScore);
    this.anomalyBar.setVisible(true);
    this.anomalyBar.setSize(ANOMALY_BAR_WIDTH * progress, ANOMALY_BAR_HEIGHT);

    const low = Phaser.Display.Color.ValueToColor(ANOMALY_COLOR_LOW);
    const high = Phaser.Display.Color.ValueToColor(ANOMALY_COLOR_HIGH);
    const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(low, high, 100, Math.round(progress * 100));
    this.anomalyBar.setFillStyle(Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b));

    this.anomalyPulseTween?.stop();
    this.anomalyBar.setAlpha(1);
    const pulseDuration = Phaser.Math.Linear(ANOMALY_PULSE_DURATION_MAX_MS, ANOMALY_PULSE_DURATION_MIN_MS, progress);
    this.anomalyPulseTween = this.tweens.add({
      targets: this.anomalyBar,
      alpha: { from: 1, to: 0.3 },
      duration: pulseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private spawnMole(): void {
    if (!this.effectiveParams) {
      return;
    }
    const emptyHoles = this.holes.filter((hole) => hole.moleShownAt === null);
    if (emptyHoles.length === 0) {
      return;
    }
    const hole = Phaser.Utils.Array.GetRandom(emptyHoles);
    hole.mole.setVisible(true);
    hole.moleShownAt = this.time.now;

    const progress = Phaser.Math.Clamp(1 - this.remainingMs / this.effectiveParams.runDurationMs, 0, 1);
    const interval = Phaser.Math.Linear(MOLE_SPAWN_INTERVAL_START_MS, MOLE_SPAWN_INTERVAL_END_MS, progress);
    this.nextSpawnAt = this.time.now + interval;

    this.time.delayedCall(this.effectiveParams.moleVisibleDurationMs, () => {
      if (hole.moleShownAt === null) {
        return; // wurde schon per Hover getroffen
      }
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
      if (this.effectiveParams) {
        // Despawn ohne Treffer zählt als verpasste Mole (siehe Klassen-
        // Kommentar zu checkHoverHits/Hover-Mechanik) — rein informativ für
        // die Run-Zusammenfassung, kein Score-Abzug mehr (mit dem Nutzer
        // abgestimmt: Strafpunkte wirken kontraproduktiv aufs Spielerlebnis).
        this.misses += 1;
        this.showMissFeedback(hole.x, hole.y);
        this.updateStatusText();
      }
    });
  }

  // Hover-Mechanik statt Klick: Ab dem Moment, in dem der Cursor in Reichweite
  // (Basisradius + Größerer-Hammer-Bonus) einer aktiven Mole ist, zählt das
  // als Treffer. Grund: Sobald der Radius groß genug wird, würde ein
  // klick-basiertes Treffen/Verfehlen keine räumliche Zielgenauigkeit mehr
  // testen (das Upgrade würde das Klicken selbst sinnlos machen) — Hover
  // macht "in Reichweite sein" zur eigentlichen Fähigkeit, die das Upgrade
  // ausbaut, und bleibt aktives Spielen (Cursor muss aktiv zur richtigen von
  // 9 Positionen bewegt werden). Ein "Fehlklick" gibt es dadurch nicht mehr;
  // eine unangetastet despawnte Mole zählt lediglich als verpasst (siehe
  // spawnMole()), ohne Score-Abzug.
  private checkHoverHits(): void {
    if (!this.effectiveParams) {
      return;
    }
    const pointer = this.input.activePointer;
    const effectiveRadius = HOLE_RADIUS + this.effectiveParams.hitRadiusBonusPx;

    for (const hole of this.holes) {
      if (hole.moleShownAt === null) {
        continue;
      }
      const dx = hole.x - pointer.x;
      const dy = hole.y - pointer.y;
      if (dx * dx + dy * dy > effectiveRadius * effectiveRadius) {
        continue;
      }

      const reaktionszeitMs = this.time.now - hole.moleShownAt;
      this.score = applyHit(this.score, reaktionszeitMs, this.effectiveParams);
      this.hits += 1;
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
      this.showHitFeedback(hole, reaktionszeitMs);
    }
  }

  // Rein visuelles Feedback (keine Sound-Effekte, SPECIFICATION.md Abschnitt
  // 11 Nicht-Ziele). Farbe/Label-Staffelung nach zeit_bonus ist in
  // SPECIFICATION.md nicht vorgegeben, sinnvolle Annahme (siehe config.ts).
  private showHitFeedback(hole: HoleView, reaktionszeitMs: number): void {
    if (!this.effectiveParams) {
      return;
    }
    this.tweens.add({
      targets: hole.mole,
      scale: 1.35,
      duration: PUNCH_TWEEN_DURATION_MS,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    const zeitBonus = computeZeitBonus(reaktionszeitMs, this.effectiveParams);
    const isPerfect = zeitBonus >= PERFEKT_ZEIT_BONUS_THRESHOLD;
    const hitScore = computeHitScore(reaktionszeitMs, this.effectiveParams);
    const label = isPerfect ? `Perfekt +${formatNumber(hitScore)}` : `+${formatNumber(hitScore)}`;
    const color = isPerfect ? PERFECT_HIT_COLOR : NORMAL_HIT_COLOR;

    this.spawnFloatingText(hole.x, hole.y - HOLE_RADIUS, label, color, HIT_FEEDBACK_DURATION_MS);
  }

  // Rein informatives Feedback (kein Score-Abzug mehr, mit dem Nutzer
  // abgestimmt: Strafpunkte wirken kontraproduktiv aufs Spielerlebnis) —
  // neutrale Farbe statt Alarm-Rot, neutraler Text statt "-X".
  private showMissFeedback(x: number, y: number): void {
    const flash = this.add.circle(x, y, HOLE_RADIUS * 0.5, MISS_COLOR, 0.5);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.6,
      duration: MISS_FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    this.spawnFloatingText(x, y, 'Verpasst', MISS_COLOR, MISS_FEEDBACK_DURATION_MS);
  }

  private spawnFloatingText(x: number, y: number, label: string, color: number, durationMs: number): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: colorToCss(color),
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - FEEDBACK_RISE_DISTANCE_PX,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private updateStatusText(): void {
    const isPlaying = this.uiState.getState() === 'playing';
    const secondsLeft = isPlaying ? Math.ceil(this.remainingMs / 1000) : 0;
    const timerLabel = isPlaying ? `  |  Zeit: ${secondsLeft}s` : '';
    this.statusText.setText(`Score: ${formatNumber(this.score)}${timerLabel}`);
  }
}
