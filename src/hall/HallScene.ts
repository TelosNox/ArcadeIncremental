import Phaser from 'phaser';
import { Decimal } from '../core/BigNumber';
import { formatNumber } from '../ui/formatNumber';
import type { HallContextMenu } from '../ui/HallContextMenu';
import type { HallPanel } from '../ui/HallPanel';
import type { StateStore } from '../state/StateStore';
import { MACHINE_CATALOG } from './MachineCatalog';
import { isMachineUnlocked } from './UnlockLogic';

const GRID_COLUMNS = 4;
const SLOT_WIDTH = 170;
const SLOT_HEIGHT = 150;
const GRID_ORIGIN_X = 130;
const GRID_ORIGIN_Y = 190;

const LOCKED_COLOR = 0x2a2a2a;
const LOCKED_BORDER = 0x3a3a3a;
const UNLOCKED_COLOR = 0x2d4a6a;
const UNLOCKED_BORDER = 0x4a8fd1;
const UNAVAILABLE_COLOR = 0x232323;
const UNAVAILABLE_BORDER = 0x2e2e2e;

// Hallen-Szene (Phase 5, mit dem Nutzer abgestimmt): eigene Phaser-Scene
// statt eines DOM-Dialogs — Standardort ab dem Break. Zeigt alle 8
// Automaten-Slots gleichzeitig (freigeschaltet/gesperrt/noch nicht
// verfügbar, siehe hall/MachineCatalog.ts); Klick öffnet das
// HallContextMenu (Spielen/Upgrades & Boosts/Freischalten). Zunächst nur
// Icon-Kacheln mit Name — Platz für spätere animierte Cabinets mit
// Mini-Display ist architektonisch nicht versperrt, aber ausdrücklich noch
// nicht Teil dieser Phase.
export class HallScene extends Phaser.Scene {
  private creditsText!: Phaser.GameObjects.Text;
  private slotObjects: Phaser.GameObjects.GameObject[] = [];
  private lastHallCredits: Decimal = new Decimal(-1);
  private lastUnlockedMachines: readonly number[] = [];

  constructor(
    private readonly store: StateStore,
    private readonly hallContextMenu: HallContextMenu,
    private readonly hallPanel: HallPanel,
  ) {
    super('HallScene');
  }

  create(): void {
    this.add
      .text(400, 40, 'Halle', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    this.creditsText = this.add.text(20, 20, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c9a3ff',
    });

    const hallenVerwaltungButton = this.add
      .text(780, 20, 'Hallen-Verwaltung ▸', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8fd0ff',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    hallenVerwaltungButton.on('pointerdown', () => this.hallPanel.open());

    this.renderSlots();

    this.lastHallCredits = this.store.getState().hallCredits;
    this.lastUnlockedMachines = this.store.getState().unlockedMachines;
    const unsubscribe = this.store.subscribe((state) => {
      if (state.hallCredits === this.lastHallCredits && state.unlockedMachines === this.lastUnlockedMachines) {
        return;
      }
      this.lastHallCredits = state.hallCredits;
      this.lastUnlockedMachines = state.unlockedMachines;
      this.renderSlots();
    });
    // Ohne dieses Abmelden bliebe der Listener nach dem Verlassen der Halle
    // (this.scene.start('WhackAMoleScene'/'ShooterScene')) aktiv und würde
    // bei jedem künftigen Store-Event (z. B. jedem abgeschlossenen Run, der
    // Hallen-Credits gutschreibt) versuchen, auf eine gestoppte Scene zu
    // zeichnen — das wirft eine Exception mitten im synchronen store.emit()
    // und lässt den auslösenden Run "hängen" (siehe Bugreport: Automat 1
    // bleibt nach dem Break am Rundenende bei "Zeit: 1s" stehen).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  private renderSlots(): void {
    const state = this.store.getState();
    this.creditsText.setText(`Hallen-Credits: ${formatNumber(state.hallCredits)}`);

    for (const object of this.slotObjects) {
      object.destroy();
    }
    this.slotObjects = [];

    MACHINE_CATALOG.forEach((entry, index) => {
      const col = index % GRID_COLUMNS;
      const row = Math.floor(index / GRID_COLUMNS);
      const x = GRID_ORIGIN_X + col * SLOT_WIDTH;
      const y = GRID_ORIGIN_Y + row * SLOT_HEIGHT;

      const unlocked = isMachineUnlocked(state.unlockedMachines, entry.number);
      const available = Boolean(entry.sceneKey);
      const fillColor = !available ? UNAVAILABLE_COLOR : unlocked ? UNLOCKED_COLOR : LOCKED_COLOR;
      const borderColor = !available ? UNAVAILABLE_BORDER : unlocked ? UNLOCKED_BORDER : LOCKED_BORDER;

      const tile = this.add
        .rectangle(x, y, SLOT_WIDTH - 20, SLOT_HEIGHT - 20, fillColor)
        .setStrokeStyle(2, borderColor)
        .setInteractive({ useHandCursor: true });
      tile.on('pointerdown', () => this.hallContextMenu.openFor(entry.number));

      const label = this.add
        .text(x, y - 12, `Automat ${entry.number}\n${entry.name}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: unlocked ? '#ffffff' : '#888888',
          align: 'center',
        })
        .setOrigin(0.5);

      const statusLabel = this.add
        .text(x, y + 34, !available ? '???' : unlocked ? 'freigeschaltet' : '🔒 gesperrt', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: unlocked ? '#8fd0ff' : '#666666',
        })
        .setOrigin(0.5);

      this.slotObjects.push(tile, label, statusLabel);
    });
  }
}
