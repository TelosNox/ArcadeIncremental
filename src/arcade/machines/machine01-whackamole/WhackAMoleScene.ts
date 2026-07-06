import Phaser from 'phaser';
import { SCORE_TO_CREDITS_DIVISOR } from '../../../config/balance';
import { Decimal, ZERO } from '../../../core/BigNumber';
import type { ArcadeBridge } from '../../PhaserBridge';
import { scoreToCredits } from '../../shared/ScoreToCurrency';
import {
  HOLE_COUNT,
  MOLE_SPAWN_INTERVAL_END_MS,
  MOLE_SPAWN_INTERVAL_START_MS,
  MOLE_VISIBLE_DURATION_MS,
  RUN_DURATION_MS,
} from './config';
import { applyHit, applyMiss } from './scoring';

// Reine Layout-Werte fürs Platzhalter-Grid, keine Balance-Konstanten
// (Nicht-Ziele, SPECIFICATION.md Abschnitt 11: keine finalen Assets nötig).
const GRID_COLUMNS = 3;
const HOLE_RADIUS = 55;
const HOLE_SPACING = 180;
const GRID_CENTER_X = 400;
const GRID_CENTER_Y = 300;

type RunPhase = 'idle' | 'playing' | 'result';

interface HoleView {
  x: number;
  y: number;
  background: Phaser.GameObjects.Arc;
  mole: Phaser.GameObjects.Arc;
  moleShownAt: number | null;
}

export class WhackAMoleScene extends Phaser.Scene {
  private readonly bridge: ArcadeBridge;

  private phase: RunPhase = 'idle';
  private holes: HoleView[] = [];
  private score: Decimal = ZERO;
  private hits = 0;
  private misses = 0;
  private remainingMs = 0;
  private nextSpawnAt = 0;

  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor(bridge: ArcadeBridge) {
    super('WhackAMoleScene');
    this.bridge = bridge;
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer.x, pointer.y);
    });

    this.statusText = this.add.text(20, 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });

    this.promptText = this.add
      .text(GRID_CENTER_X, 560, 'Klicken zum Starten', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffff88',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.promptText.on('pointerdown', () => {
      if (this.phase !== 'playing') {
        this.startRun();
      }
    });

    this.updateStatusText();
  }

  update(_time: number, delta: number): void {
    if (this.phase !== 'playing') {
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

    this.updateStatusText();
  }

  private startRun(): void {
    this.phase = 'playing';
    this.score = ZERO;
    this.hits = 0;
    this.misses = 0;
    this.remainingMs = RUN_DURATION_MS;
    this.nextSpawnAt = this.time.now;
    this.promptText.setVisible(false);

    for (const hole of this.holes) {
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
    }

    this.updateStatusText();
  }

  private endRun(): void {
    this.phase = 'result';
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

    this.promptText
      .setText(
        `Run beendet — Score: ${this.score.toString()} (${this.hits} Treffer, ${this.misses} Fehlklicks)\n` +
          `+${creditsEarned.toString()} Reflex-Punkte — Klicken für neuen Run`,
      )
      .setVisible(true);
    this.updateStatusText();
  }

  private spawnMole(): void {
    const emptyHoles = this.holes.filter((hole) => hole.moleShownAt === null);
    if (emptyHoles.length === 0) {
      return;
    }
    const hole = Phaser.Utils.Array.GetRandom(emptyHoles);
    hole.mole.setVisible(true);
    hole.moleShownAt = this.time.now;

    const progress = Phaser.Math.Clamp(1 - this.remainingMs / RUN_DURATION_MS, 0, 1);
    const interval = Phaser.Math.Linear(MOLE_SPAWN_INTERVAL_START_MS, MOLE_SPAWN_INTERVAL_END_MS, progress);
    this.nextSpawnAt = this.time.now + interval;

    this.time.delayedCall(MOLE_VISIBLE_DURATION_MS, () => {
      if (hole.moleShownAt !== null) {
        hole.mole.setVisible(false);
        hole.moleShownAt = null;
      }
    });
  }

  private handlePointerDown(x: number, y: number): void {
    if (this.phase !== 'playing') {
      return;
    }

    const hole = this.holes.find((candidate) => {
      const dx = candidate.x - x;
      const dy = candidate.y - y;
      return dx * dx + dy * dy <= HOLE_RADIUS * HOLE_RADIUS;
    });
    if (!hole) {
      return; // Klick daneben zählt nicht als Fehlklick (nur Klicks auf ein Loch)
    }

    if (hole.moleShownAt !== null) {
      const reaktionszeitMs = this.time.now - hole.moleShownAt;
      this.score = applyHit(this.score, reaktionszeitMs);
      this.hits += 1;
      hole.mole.setVisible(false);
      hole.moleShownAt = null;
    } else {
      this.score = applyMiss(this.score);
      this.misses += 1;
    }

    this.updateStatusText();
  }

  private updateStatusText(): void {
    const secondsLeft = this.phase === 'playing' ? Math.ceil(this.remainingMs / 1000) : 0;
    const timerLabel = this.phase === 'playing' ? `  |  Zeit: ${secondsLeft}s` : '';
    this.statusText.setText(`Score: ${this.score.toString()}${timerLabel}`);
  }
}
