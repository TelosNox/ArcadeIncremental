import Phaser from 'phaser';
import { createArcadeBridge } from './arcade/PhaserBridge';
import { WhackAMoleScene } from './arcade/machines/machine01-whackamole/WhackAMoleScene';
import { Decimal } from './core/BigNumber';
import { GameLoop } from './core/GameLoop';
import { SaveManager } from './persistence/SaveManager';
import { createInitialGameState } from './state/GameState';
import { StateStore } from './state/StateStore';
import { formatNumber } from './ui/formatNumber';
import { RevealSequence } from './ui/RevealSequence';
import { UIStateController } from './ui/UIState';
import { UpgradePanel } from './ui/UpgradePanel';

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

// Phase 2/3: Automat 1 (Whac-a-Mole) mit Upgrades, Break-Bedingung und
// Reveal-Platzhalter (noch ohne passive Automatisierung/Effizienz-Anzeige —
// das bleibt Phase 3). Die Scene kennt den StateStore nicht direkt, sondern
// liest/schreibt ausschließlich über die ArcadeBridge (CLAUDE.md,
// Architektur-Regel 1). UpgradePanel/RevealSequence sind DOM-Overlays und
// bekommen den Store direkt (wie main.ts selbst weiter unten), da sie keine
// Phaser-Scene sind und Regel 1 nicht für sie gilt.
const uiState = new UIStateController();
const bridge = createArcadeBridge(store);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a1a',
  scene: new WhackAMoleScene(bridge, uiState),
});

new UpgradePanel(store, uiState);
new RevealSequence(uiState);

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

// Auto-Save: bisher gab es nur das manuelle window.arcadeDebug.save() für die
// Konsole, wodurch jeder Seiten-Reload ungespeicherten Fortschritt (z. B.
// gerade gekaufte Upgrades) verwarf. lastPersisted trackt die Felder, die
// tatsächlich im Save landen (siehe persistence/schema.ts) — nur bei
// tatsächlicher Änderung neu speichern, nicht bei den ~60/s Tick-Events.
let lastPersisted = {
  hallCredits: store.getState().hallCredits,
  reflexPunkte: store.getState().reflexPunkte,
  machine01Upgrades: store.getState().machine01Upgrades,
  machine01RunCount: store.getState().machine01RunCount,
  machine01TotalScore: store.getState().machine01TotalScore,
  machine01HasBroken: store.getState().machine01HasBroken,
};
store.subscribe((state) => {
  const changed =
    state.hallCredits !== lastPersisted.hallCredits ||
    state.reflexPunkte !== lastPersisted.reflexPunkte ||
    state.machine01Upgrades !== lastPersisted.machine01Upgrades ||
    state.machine01RunCount !== lastPersisted.machine01RunCount ||
    state.machine01TotalScore !== lastPersisted.machine01TotalScore ||
    state.machine01HasBroken !== lastPersisted.machine01HasBroken;
  if (!changed) {
    return;
  }
  lastPersisted = {
    hallCredits: state.hallCredits,
    reflexPunkte: state.reflexPunkte,
    machine01Upgrades: state.machine01Upgrades,
    machine01RunCount: state.machine01RunCount,
    machine01TotalScore: state.machine01TotalScore,
    machine01HasBroken: state.machine01HasBroken,
  };
  saveManager.save(state);
});

// Sicherheitsnetz für alles, was der obige Vergleich übersehen könnte (z. B.
// künftige GameState-Felder, die vergessen werden in die Liste aufzunehmen).
// isResetting unterdrückt genau diesen Save während eines absichtlichen
// Resets (siehe arcadeDebug.reset()) — sonst würde reload() selbst über
// beforeunload den gerade gelöschten Save mit dem noch im Speicher stehenden
// alten Zustand wieder zurückschreiben, bevor die Seite überhaupt neu lädt.
let isResetting = false;
window.addEventListener('beforeunload', () => {
  if (isResetting) {
    return;
  }
  saveManager.save(store.getState());
});

declare global {
  interface Window {
    arcadeDebug: {
      store: StateStore;
      loop: GameLoop;
      saveManager: SaveManager;
      addHallCredits: (amount: number) => void;
      save: () => void;
      reset: () => void;
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
  reset: () => {
    isResetting = true;
    saveManager.clear();
    window.location.reload();
  },
};
