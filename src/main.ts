import Phaser from 'phaser';

// Phase 0: leere Szene als Smoke-Test für die Deployment-Pipeline.
// Ab Phase 2 ersetzt durch WhackAMoleScene.
class BootScene extends Phaser.Scene {
  preload(): void {}

  create(): void {
    this.add
      .text(400, 300, 'Incremental Arcade Hall', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a1a',
  scene: [BootScene],
});
