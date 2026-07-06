import Phaser from 'phaser';
import { createArcadeBridge } from './arcade/PhaserBridge';
import { WhackAMoleScene } from './arcade/machines/machine01-whackamole/WhackAMoleScene';
import { Decimal } from './core/BigNumber';
import { GameLoop } from './core/GameLoop';
import { SaveManager } from './persistence/SaveManager';
import { createInitialGameState } from './state/GameState';
import { StateStore } from './state/StateStore';
import { formatNumber } from './ui/formatNumber';

// Phase 1: Idle-Kern-Fundament. Lädt beim Start einen vorhandenen Save und
// verdrahtet GameLoop-Ticks in den StateStore.
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

// Phase 2: Automat 1 (Whac-a-Mole), noch ohne Upgrades/Break-Logik. Die
// Scene kennt den StateStore nicht direkt, sondern meldet Runs ausschließlich
// über die ArcadeBridge (CLAUDE.md, Architektur-Regel 1).
const bridge = createArcadeBridge(store);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a1a',
  scene: new WhackAMoleScene(bridge),
});

let lastLoggedCredits = store.getState().hallCredits;
let lastLoggedReflexPunkte = store.getState().reflexPunkte;
store.subscribe((state) => {
  if (!state.hallCredits.eq(lastLoggedCredits)) {
    lastLoggedCredits = state.hallCredits;
    console.log(`[StateStore] hallCredits = ${formatNumber(state.hallCredits)}`);
  }
  if (!state.reflexPunkte.eq(lastLoggedReflexPunkte)) {
    lastLoggedReflexPunkte = state.reflexPunkte;
    console.log(`[StateStore] reflexPunkte = ${formatNumber(state.reflexPunkte)}`);
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
