import Phaser from 'phaser';
import { Decimal } from './core/BigNumber';
import { GameLoop } from './core/GameLoop';
import { SaveManager } from './persistence/SaveManager';
import { createInitialGameState } from './state/GameState';
import { StateStore } from './state/StateStore';

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

// Phase 1: Idle-Kern-Fundament. Noch ohne echte Automat-Anbindung (folgt
// Phase 2) — hier nur verdrahtet, damit StateStore/GameLoop/SaveManager
// manuell über die Browser-Konsole (window.arcadeDebug) geprüft werden können.
const saveManager = new SaveManager();
const loadResult = saveManager.load();
if (loadResult.status === 'refused' || loadResult.status === 'reset') {
  console.warn(`[SaveManager] ${loadResult.reason}`);
}
const initialState = loadResult.status === 'ok' ? loadResult.state : createInitialGameState();

const store = new StateStore(initialState);
const loop = new GameLoop();

loop.onTick((deltaMs, timestamp) => {
  store.emit({ type: 'tick', deltaMs, timestamp });
});
loop.start();

let lastLoggedCredits = store.getState().hallCredits;
store.subscribe((state) => {
  if (!state.hallCredits.eq(lastLoggedCredits)) {
    lastLoggedCredits = state.hallCredits;
    console.log(`[StateStore] hallCredits = ${state.hallCredits.toString()}`);
  }
});

declare global {
  interface Window {
    arcadeDebug: {
      store: StateStore;
      loop: GameLoop;
      saveManager: SaveManager;
      addHallCredits: (amount: number) => void;
      save: () => void;
    };
  }
}

window.arcadeDebug = {
  store,
  loop,
  saveManager,
  addHallCredits: (amount: number) => {
    store.emit({ type: 'hallCreditsAdded', amount: new Decimal(amount) });
  },
  save: () => {
    saveManager.save(store.getState());
    console.log('[SaveManager] gespeichert.');
  },
};
