import Phaser from 'phaser';
import { createArcadeBridge } from './arcade/PhaserBridge';
import { WhackAMoleScene } from './arcade/machines/machine01-whackamole/WhackAMoleScene';
import { ShooterScene } from './arcade/machines/machine02-shooter/ShooterScene';
import { Decimal } from './core/BigNumber';
import { GameLoop } from './core/GameLoop';
import { HallScene } from './hall/HallScene';
import { SaveManager } from './persistence/SaveManager';
import { createInitialGameState } from './state/GameState';
import { StateStore } from './state/StateStore';
import { formatNumber } from './ui/formatNumber';
import { HallContextMenu } from './ui/HallContextMenu';
import { HallPanel } from './ui/HallPanel';
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

// Phase 2/3/5: Automat 1 (Whac-a-Mole) und Automat 2 (Shooter) mit Upgrades,
// Break-Bedingung (nur Automat 1) und Reveal-Platzhalter (noch ohne passive
// Automatisierung/Effizienz-Anzeige — das bleibt Phase 3/7). Scenes kennen
// den StateStore nicht direkt, sondern lesen/schreiben ausschließlich über
// die ArcadeBridge (CLAUDE.md, Architektur-Regel 1). Die HallScene liegt im
// Hallen-Layer (SPECIFICATION.md Abschnitt 2: "Konsument des State Store für
// Meta-Progression") und bekommt den Store wie die DOM-Overlays direkt.
const uiState = new UIStateController();
const bridge = createArcadeBridge(store);

const upgradePanel = new UpgradePanel(store, uiState);
const hallPanel = new HallPanel(store);

// hallSceneRef löst die Zirkularität HallContextMenu <-> HallScene: das Menü
// braucht einen Szenenwechsel-Callback, die Szene braucht das fertig gebaute
// Menü. Der Callback feuert erst nach vollständiger Konstruktion beider.
let hallSceneRef: HallScene;
const hallContextMenu = new HallContextMenu(store, upgradePanel, (sceneKey) => hallSceneRef.scene.start(sceneKey));
const hallScene = new HallScene(store, hallContextMenu, hallPanel);
hallSceneRef = hallScene;

const whackAMoleScene = new WhackAMoleScene(bridge, uiState, () => upgradePanel.open(1));
const shooterScene = new ShooterScene(bridge, uiState, () => upgradePanel.open(2));

// Seit Phase 5 landet der Spieler nach dem Reveal in der HallScene statt im
// Idle-Zustand von Automat 1 (mit dem Nutzer abgestimmt).
new RevealSequence(uiState, () => whackAMoleScene.scene.start('HallScene'));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a1a',
});

// Startszene hängt vom geladenen Save ab: vor dem Break beginnt der Spieler
// blind in Automat 1 (Blind/Reveal-Twist, SPECIFICATION.md Abschnitt 1);
// danach ist die Halle der Standardort, aus dem heraus Automaten betreten
// werden (mit dem Nutzer abgestimmt, Phase 5).
const startInHall = initialState.machine01HasBroken;
game.scene.add('WhackAMoleScene', whackAMoleScene, !startInHall);
game.scene.add('ShooterScene', shooterScene, false);
game.scene.add('HallScene', hallScene, startInHall);

let lastLoggedCredits = store.getState().hallCredits;
let lastLoggedReflexPunkte = store.getState().reflexPunkte;
let lastLoggedAbschuesse = store.getState().abschuesse;
store.subscribe((state) => {
  if (!state.hallCredits.eq(lastLoggedCredits)) {
    lastLoggedCredits = state.hallCredits;
    console.log(`[StateStore] hallCredits = ${formatNumber(state.hallCredits)}`);
  }
  if (!state.reflexPunkte.eq(lastLoggedReflexPunkte)) {
    lastLoggedReflexPunkte = state.reflexPunkte;
    console.log(`[StateStore] reflexPunkte = ${formatNumber(state.reflexPunkte)}`);
  }
  if (!state.abschuesse.eq(lastLoggedAbschuesse)) {
    lastLoggedAbschuesse = state.abschuesse;
    console.log(`[StateStore] abschuesse = ${formatNumber(state.abschuesse)}`);
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
  abschuesse: store.getState().abschuesse,
  machine01Upgrades: store.getState().machine01Upgrades,
  machine01RunCount: store.getState().machine01RunCount,
  machine01TotalScore: store.getState().machine01TotalScore,
  machine01HasBroken: store.getState().machine01HasBroken,
  machine02Upgrades: store.getState().machine02Upgrades,
  unlockedMachines: store.getState().unlockedMachines,
  hallUpgrades: store.getState().hallUpgrades,
  machine01SupportBoosts: store.getState().machine01SupportBoosts,
  machine02SupportBoosts: store.getState().machine02SupportBoosts,
};
store.subscribe((state) => {
  const changed =
    state.hallCredits !== lastPersisted.hallCredits ||
    state.reflexPunkte !== lastPersisted.reflexPunkte ||
    state.abschuesse !== lastPersisted.abschuesse ||
    state.machine01Upgrades !== lastPersisted.machine01Upgrades ||
    state.machine01RunCount !== lastPersisted.machine01RunCount ||
    state.machine01TotalScore !== lastPersisted.machine01TotalScore ||
    state.machine01HasBroken !== lastPersisted.machine01HasBroken ||
    state.machine02Upgrades !== lastPersisted.machine02Upgrades ||
    state.unlockedMachines !== lastPersisted.unlockedMachines ||
    state.hallUpgrades !== lastPersisted.hallUpgrades ||
    state.machine01SupportBoosts !== lastPersisted.machine01SupportBoosts ||
    state.machine02SupportBoosts !== lastPersisted.machine02SupportBoosts;
  if (!changed) {
    return;
  }
  lastPersisted = {
    hallCredits: state.hallCredits,
    reflexPunkte: state.reflexPunkte,
    abschuesse: state.abschuesse,
    machine01Upgrades: state.machine01Upgrades,
    machine01RunCount: state.machine01RunCount,
    machine01TotalScore: state.machine01TotalScore,
    machine01HasBroken: state.machine01HasBroken,
    machine02Upgrades: state.machine02Upgrades,
    unlockedMachines: state.unlockedMachines,
    hallUpgrades: state.hallUpgrades,
    machine01SupportBoosts: state.machine01SupportBoosts,
    machine02SupportBoosts: state.machine02SupportBoosts,
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
