import Phaser from 'phaser';
import type { UIStateController } from '../../ui/UIState';

export interface ArcadeSceneChromeOptions {
  scene: Phaser.Scene;
  uiState: UIStateController;
  onOpenUpgrades: () => void;
  x?: number;
  upgradesY?: number;
  backToHallY?: number;
}

// Gemeinsames Chrome für alle "bereits enthüllten" Automaten-Szenen
// (DOCS/IMPLEMENTATION_PLAN.md Phase 5: "Referenz-Template für bereits
// enthüllte Automaten", validiert dass sich das Muster ohne
// Architektur-Änderung wiederholen lässt): Upgrades-Knopf + Rückkehr-Knopf
// zur HallScene, beide nur im Idle/RunResult-Zustand sichtbar. Automat 1
// (WhackAMoleScene) blendet den Rückkehr-Knopf zusätzlich vor dem Break aus
// (SPECIFICATION.md Abschnitt 1: der Blind/Reveal-Twist darf nicht
// vorwegnehmen, dass es eine Halle gibt) — das bleibt Sache der jeweiligen
// Scene, siehe deren eigenes updateOverlayVisibility().
export class ArcadeSceneChrome {
  readonly upgradesButton: Phaser.GameObjects.Text;
  readonly backToHallButton: Phaser.GameObjects.Text;

  constructor(private readonly options: ArcadeSceneChromeOptions) {
    const { scene, x = 780, upgradesY = 20, backToHallY = 48 } = options;

    this.upgradesButton = scene.add
      .text(x, upgradesY, 'Upgrades ▸', { fontFamily: 'monospace', fontSize: '18px', color: '#8fd0ff' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.upgradesButton.on('pointerdown', () => {
      if (this.isReadyForOverlay()) {
        options.onOpenUpgrades();
      }
    });

    this.backToHallButton = scene.add
      .text(x, backToHallY, '◂ Zur Halle', { fontFamily: 'monospace', fontSize: '18px', color: '#c9a3ff' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.backToHallButton.on('pointerdown', () => {
      if (this.isReadyForOverlay()) {
        scene.scene.start('HallScene');
      }
    });
  }

  private isReadyForOverlay(): boolean {
    const current = this.options.uiState.getState();
    return current === 'idle' || current === 'runResult';
  }

  // showBackToHall erlaubt Automat 1, den Rückkehr-Knopf zusätzlich vor dem
  // Break zu verstecken (siehe Klassenkommentar) — für alle anderen
  // Automaten ist er identisch mit showPrompt.
  setVisible(showPrompt: boolean, showBackToHall: boolean = showPrompt): void {
    this.upgradesButton.setVisible(showPrompt);
    this.backToHallButton.setVisible(showPrompt && showBackToHall);
  }
}
