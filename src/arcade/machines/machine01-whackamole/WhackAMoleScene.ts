import Phaser from 'phaser';
import { SCORE_TO_CREDITS_DIVISOR } from '../../../config/balance';
import { Decimal, ZERO } from '../../../core/BigNumber';
import type { ArcadeBridge } from '../../PhaserBridge';
import { scoreToCredits } from '../../shared/ScoreToCurrency';
import { formatNumber } from '../../../ui/formatNumber';
import type { UIState, UIStateController } from '../../../ui/UIState';
import { hasReachedBreak } from './breakCondition';
import {
  FEEDBACK_RISE_DISTANCE_PX,
  HIT_FEEDBACK_DURATION_MS,
  HOLE_COUNT,
  MISS_COLOR,
  MISS_FEEDBACK_DURATION_MS,
  MISS_FLASH_DURATION_MS,
  MOLE_SPAWN_INTERVAL_END_MS,
  MOLE_SPAWN_INTERVAL_START_MS,
  MOLE_VISIBLE_DURATION_MS,
  NORMAL_HIT_COLOR,
  PERFECT_HIT_COLOR,
  PERFEKT_ZEIT_BONUS_THRESHOLD,
  PUNCH_TWEEN_DURATION_MS,
} from './config';
import { applyHit, applyMiss, computeHitScore, computeMissPenalty, computeZeitBonus } from './scoring';
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

  private holes: HoleView[] = [];
  private score: Decimal = ZERO;
  private hits = 0;
  private misses = 0;
  private remainingMs = 0;
  private nextSpawnAt = 0;
  private effectiveParams: EffectiveMachine01Params | null = null;

  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private upgradesButton!: Phaser.GameObjects.Text;

  constructor(bridge: ArcadeBridge, uiState: UIStateController) {
    super('WhackAMoleScene');
    this.bridge = bridge;
    this.uiState = uiState;
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

    this.upgradesButton = this.add
      .text(780, 20, 'Upgrades ▸', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#8fd0ff',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.upgradesButton.on('pointerdown', () => {
      const current = this.uiState.getState();
      if (current === 'idle' || current === 'runResult') {
        this.uiState.setState('upgrade');
      }
    });

    this.uiState.subscribe((state) => {
      this.updateOverlayVisibility(state);
    });
    this.updateOverlayVisibility(this.uiState.getState());

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
    this.upgradesButton.setVisible(showPrompt);
  }

  private startRun(): void {
    const upgrades = this.bridge.getState().machine01Upgrades;
    this.effectiveParams = computeEffectiveParams(upgrades);

    this.uiState.setState('playing');
    this.score = ZERO;
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
    this.updateStatusText();
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

    this.time.delayedCall(MOLE_VISIBLE_DURATION_MS, () => {
      if (hole.moleShownAt === null) {
        return; // wurde schon per Hover getroffen
      }
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
      if (this.effectiveParams) {
        // Despawn ohne Treffer zählt als verpasste Mole (siehe Klassen-
        // Kommentar zu checkHoverHits/Hover-Mechanik).
        this.score = applyMiss(this.score, this.effectiveParams);
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
  // die Strafe wird stattdessen fällig, wenn eine Mole unangetastet despawnt
  // (siehe spawnMole()).
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

  private showMissFeedback(x: number, y: number): void {
    if (!this.effectiveParams) {
      return;
    }
    const flash = this.add.circle(x, y, HOLE_RADIUS * 0.5, MISS_COLOR, 0.6);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.6,
      duration: MISS_FLASH_DURATION_MS,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    this.spawnFloatingText(
      x,
      y,
      `-${formatNumber(computeMissPenalty(this.effectiveParams))}`,
      MISS_COLOR,
      MISS_FEEDBACK_DURATION_MS,
    );
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
