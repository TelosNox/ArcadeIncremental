import Phaser from 'phaser';
import { MACHINE02_SCORE_TO_CREDITS_DIVISOR } from '../../../config/balance';
import { Decimal, ZERO } from '../../../core/BigNumber';
import type { ArcadeBridge } from '../../PhaserBridge';
import { ArcadeSceneChrome } from '../../shared/ArcadeSceneBase';
import { scoreToCredits } from '../../shared/ScoreToCurrency';
import { formatNumber } from '../../../ui/formatNumber';
import type { UIState, UIStateController } from '../../../ui/UIState';
import {
  HARD_TIMEOUT_MS,
  INVADER_BASE_SPEED_PX_PER_S,
  INVADER_COLS,
  INVADER_FIRE_INTERVAL_DECREASE_PER_WAVE_MS,
  INVADER_FIRE_INTERVAL_MIN_MS,
  INVADER_FIRE_INTERVAL_START_MS,
  INVADER_ROWS,
  INVADER_SPEED_INCREASE_PER_WAVE_PX_PER_S,
  PROJECTILE_SPEED_PX_PER_S,
  WELLEN_DECKEL,
} from './config';
import { applyHit, applyWaveCleared } from './scoring';
import { computeEffectiveParams, type EffectiveMachine02Params } from './upgrades';

// Reine Layout-Werte fürs Platzhalter-Grid, keine Balance-Konstanten
// (Nicht-Ziele, SPECIFICATION.md Abschnitt 11: keine finalen Assets nötig).
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANNON_Y = 560;
const CANNON_HALF_WIDTH = 22;
const INVADER_SPACING_X = 70;
const INVADER_SPACING_Y = 50;
const INVADER_ORIGIN_Y = 90;
const INVADER_HALF_SIZE = 18;
const INVADER_DESCEND_STEP_PX = 22;
const ENEMY_PROJECTILE_SPEED_PX_PER_S = 220;

interface Invader {
  x: number;
  y: number;
  alive: boolean;
  gameObject: Phaser.GameObjects.Rectangle;
}

interface Projectile {
  y: number;
  gameObject: Phaser.GameObjects.Rectangle;
}

export class ShooterScene extends Phaser.Scene {
  private readonly bridge: ArcadeBridge;
  private readonly uiState: UIStateController;
  private readonly openUpgrades: () => void;

  private cannon!: Phaser.GameObjects.Triangle;
  private statusText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private chrome!: ArcadeSceneChrome;

  private effectiveParams: EffectiveMachine02Params | null = null;
  private score: Decimal = ZERO;
  private streak = 0;
  private lives = 0;
  private wave = 1;
  private elapsedMs = 0;
  private lastShotAt = -Infinity;
  private invaderDirection: 1 | -1 = 1;
  private invaderSpeed = INVADER_BASE_SPEED_PX_PER_S;
  private invaderFireIntervalMs = INVADER_FIRE_INTERVAL_START_MS;
  private nextInvaderShotAt = 0;

  private invaders: Invader[] = [];
  private playerProjectiles: Projectile[] = [];
  private enemyProjectiles: Projectile[] = [];

  constructor(bridge: ArcadeBridge, uiState: UIStateController, openUpgrades: () => void) {
    super('ShooterScene');
    this.bridge = bridge;
    this.uiState = uiState;
    this.openUpgrades = openUpgrades;
  }

  create(): void {
    this.cannon = this.add.triangle(
      CANVAS_WIDTH / 2,
      CANNON_Y,
      0,
      24,
      24,
      24,
      12,
      0,
      0x8fd0ff,
    );

    this.statusText = this.add.text(20, 20, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    });

    this.promptText = this.add
      .text(CANVAS_WIDTH / 2, 560, 'Maus bewegen zum Zielen — die Kanone feuert automatisch\nKlicken zum Starten', {
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

    const unsubscribe = this.uiState.subscribe((state) => this.updateOverlayVisibility(state));
    // Siehe Kommentar in WhackAMoleScene.create(): ohne Abmelden bei
    // Scene-Shutdown häufen sich bei jedem erneuten Einstieg über die
    // HallScene Listener/Handler an, die auf bereits zerstörte Objekte des
    // vorigen create()-Durchlaufs zeigen.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.updateOverlayVisibility(this.uiState.getState());

    this.updateStatusText();
  }

  update(_time: number, delta: number): void {
    if (this.uiState.getState() !== 'playing' || !this.effectiveParams) {
      return;
    }

    this.elapsedMs += delta;
    this.cannon.x = Phaser.Math.Clamp(this.input.activePointer.x, CANNON_HALF_WIDTH, CANVAS_WIDTH - CANNON_HALF_WIDTH);

    this.maybeFireCannon();
    this.updateInvaders(delta);
    this.updateProjectiles(delta);
    this.checkCollisions();
    this.maybeFireInvaders();
    this.checkRunEndConditions();
    this.updateStatusText();
  }

  private updateOverlayVisibility(state: UIState): void {
    const showPrompt = state === 'idle' || state === 'runResult';
    this.promptText.setVisible(showPrompt);
    // Kein Blind/Reveal-Twist bei Automat 2 (SPECIFICATION.md Abschnitt 1:
    // der Twist gilt nur für Automat 1) — Rückkehr zur Halle ist immer
    // sichtbar, sobald kein Run läuft.
    this.chrome.setVisible(showPrompt);
  }

  private startRun(): void {
    const state = this.bridge.getState();
    this.effectiveParams = computeEffectiveParams(state.machine02Upgrades, state.machine02SupportBoosts);

    this.uiState.setState('playing');
    this.score = new Decimal(this.effectiveParams.startScore);
    this.streak = 0;
    this.lives = this.effectiveParams.startLeben;
    this.wave = 1;
    this.elapsedMs = 0;
    this.lastShotAt = -Infinity;
    this.invaderSpeed = INVADER_BASE_SPEED_PX_PER_S;
    this.invaderFireIntervalMs = INVADER_FIRE_INTERVAL_START_MS;
    this.nextInvaderShotAt = this.time.now + this.invaderFireIntervalMs;
    this.invaderDirection = 1;

    this.clearProjectiles();
    this.spawnWave();
    this.updateStatusText();
  }

  private spawnWave(): void {
    for (const invader of this.invaders) {
      invader.gameObject.destroy();
    }
    this.invaders = [];

    const originX = CANVAS_WIDTH / 2 - ((INVADER_COLS - 1) * INVADER_SPACING_X) / 2;
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        const x = originX + col * INVADER_SPACING_X;
        const y = INVADER_ORIGIN_Y + row * INVADER_SPACING_Y;
        const gameObject = this.add.rectangle(x, y, INVADER_HALF_SIZE * 2, INVADER_HALF_SIZE * 2, 0x9a4fd1);
        this.invaders.push({ x, y, alive: true, gameObject });
      }
    }
  }

  private clearProjectiles(): void {
    for (const projectile of [...this.playerProjectiles, ...this.enemyProjectiles]) {
      projectile.gameObject.destroy();
    }
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
  }

  // Automatisches Feuer statt Klicken (mit dem Nutzer abgestimmt): die
  // Kanone schießt von selbst, sobald der Cooldown abgelaufen ist — Zielen
  // (Cursor-Position) bleibt die aktive Fähigkeit, das wiederholte Klicken
  // entfällt.
  private maybeFireCannon(): void {
    if (!this.effectiveParams) {
      return;
    }
    if (this.time.now - this.lastShotAt < this.effectiveParams.cannonCooldownMs) {
      return;
    }
    this.lastShotAt = this.time.now;
    const gameObject = this.add.rectangle(this.cannon.x, CANNON_Y - 20, 4, 14, 0xffffff);
    this.playerProjectiles.push({ y: CANNON_Y - 20, gameObject });
  }

  private updateInvaders(delta: number): void {
    const alive = this.invaders.filter((invader) => invader.alive);
    if (alive.length === 0) {
      return;
    }

    const step = (this.invaderSpeed * delta) / 1000;
    const minX = Math.min(...alive.map((invader) => invader.x));
    const maxX = Math.max(...alive.map((invader) => invader.x));

    let descend = false;
    if ((this.invaderDirection === 1 && maxX + step >= CANVAS_WIDTH - INVADER_HALF_SIZE) ||
      (this.invaderDirection === -1 && minX - step <= INVADER_HALF_SIZE)) {
      this.invaderDirection = this.invaderDirection === 1 ? -1 : 1;
      descend = true;
    }

    for (const invader of alive) {
      invader.x += this.invaderDirection * step;
      if (descend) {
        invader.y += INVADER_DESCEND_STEP_PX;
      }
      invader.gameObject.setPosition(invader.x, invader.y);
    }
  }

  private updateProjectiles(delta: number): void {
    const playerStep = (PROJECTILE_SPEED_PX_PER_S * delta) / 1000;
    for (const projectile of [...this.playerProjectiles]) {
      projectile.y -= playerStep;
      projectile.gameObject.y = projectile.y;
      if (projectile.y < 0) {
        this.registerMiss(projectile);
      }
    }

    const enemyStep = (ENEMY_PROJECTILE_SPEED_PX_PER_S * delta) / 1000;
    for (const projectile of [...this.enemyProjectiles]) {
      projectile.y += enemyStep;
      projectile.gameObject.y = projectile.y;
      if (projectile.y > CANVAS_HEIGHT) {
        this.removeProjectile(this.enemyProjectiles, projectile);
        continue;
      }
      if (Math.abs(projectile.gameObject.x - this.cannon.x) < CANNON_HALF_WIDTH && projectile.y >= CANNON_Y - 20) {
        this.removeProjectile(this.enemyProjectiles, projectile);
        this.loseLife();
      }
    }
  }

  // Kein Strafpunkte-Abzug mehr für Fehlschüsse (mit dem Nutzer abgestimmt:
  // Strafpunkte wirken kontraproduktiv aufs Spielerlebnis) — ein Fehlschuss
  // bricht nur die Trefferserie (und damit den serien_bonus), ohne visuelles
  // Straf-Feedback. Bei automatischem Dauerfeuer wäre ein Floating-Text pro
  // Fehlschuss ohnehin sehr aufdringlich.
  private registerMiss(projectile: Projectile): void {
    this.removeProjectile(this.playerProjectiles, projectile);
    this.streak = 0;
  }

  private removeProjectile(list: Projectile[], projectile: Projectile): void {
    const index = list.indexOf(projectile);
    if (index !== -1) {
      list.splice(index, 1);
    }
    projectile.gameObject.destroy();
  }

  private checkCollisions(): void {
    if (!this.effectiveParams) {
      return;
    }
    for (const projectile of [...this.playerProjectiles]) {
      for (const invader of this.invaders) {
        if (!invader.alive) {
          continue;
        }
        const dx = invader.x - projectile.gameObject.x;
        const dy = invader.y - projectile.y;
        if (dx * dx + dy * dy > this.effectiveParams.hitRadiusPx * this.effectiveParams.hitRadiusPx) {
          continue;
        }
        invader.alive = false;
        invader.gameObject.destroy();
        this.removeProjectile(this.playerProjectiles, projectile);
        // Serie VOR diesem Treffer geht in den Bonus ein (0 beim ersten
        // Treffer einer neuen Serie), erst danach wird sie erhöht.
        this.score = applyHit(this.score, this.streak, this.effectiveParams);
        this.streak += 1;
        break;
      }
    }

    if (this.invaders.length > 0 && this.invaders.every((invader) => !invader.alive)) {
      this.onWaveCleared();
    }
  }

  private onWaveCleared(): void {
    if (!this.effectiveParams) {
      return;
    }
    this.score = applyWaveCleared(this.score, this.effectiveParams);
    this.wave += 1;
    if (this.wave > WELLEN_DECKEL) {
      this.endRun();
      return;
    }
    this.invaderSpeed += INVADER_SPEED_INCREASE_PER_WAVE_PX_PER_S;
    this.invaderFireIntervalMs = Math.max(
      this.invaderFireIntervalMs - INVADER_FIRE_INTERVAL_DECREASE_PER_WAVE_MS,
      INVADER_FIRE_INTERVAL_MIN_MS,
    );
    this.clearProjectiles();
    this.spawnWave();
  }

  private maybeFireInvaders(): void {
    if (this.time.now < this.nextInvaderShotAt) {
      return;
    }
    const alive = this.invaders.filter((invader) => invader.alive);
    if (alive.length === 0) {
      return;
    }
    const shooter = Phaser.Utils.Array.GetRandom(alive);
    const gameObject = this.add.rectangle(shooter.x, shooter.y + INVADER_HALF_SIZE, 4, 12, 0xdd4444);
    this.enemyProjectiles.push({ y: shooter.y + INVADER_HALF_SIZE, gameObject });
    this.nextInvaderShotAt = this.time.now + this.invaderFireIntervalMs;
  }

  private loseLife(): void {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.endRun();
    }
  }

  private checkRunEndConditions(): void {
    if (this.lives <= 0) {
      this.endRun();
      return;
    }
    if (this.elapsedMs >= HARD_TIMEOUT_MS) {
      this.endRun();
    }
  }

  private endRun(): void {
    if (!this.effectiveParams) {
      return;
    }
    this.clearProjectiles();
    for (const invader of this.invaders) {
      invader.gameObject.destroy();
    }
    this.invaders = [];

    const creditsEarned = scoreToCredits(this.score, MACHINE02_SCORE_TO_CREDITS_DIVISOR);
    this.bridge.emit({
      type: 'runCompleted',
      machineId: 'machine02-shooter',
      score: this.score,
      creditsEarned,
    });

    this.uiState.setState('runResult');
    this.promptText.setText(
      `Run beendet — Score: ${formatNumber(this.score)} (Welle ${Math.min(this.wave, WELLEN_DECKEL)})\n` +
        `+${formatNumber(creditsEarned)} Abschüsse — Klicken für neuen Run`,
    );
    this.effectiveParams = null;
    this.updateStatusText();
  }

  private updateStatusText(): void {
    const isPlaying = this.uiState.getState() === 'playing';
    const details = isPlaying ? `  |  Leben: ${this.lives}  |  Welle: ${this.wave}/${WELLEN_DECKEL}` : '';
    this.statusText.setText(`Score: ${formatNumber(this.score)}${details}`);
  }
}
