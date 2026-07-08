import { getMachineCatalogEntry } from '../hall/MachineCatalog';
import { canUnlockMachine, getNextLockedMachine, getUnlockCost, isMachineUnlocked } from '../hall/UnlockLogic';
import type { StateStore } from '../state/StateStore';
import { formatNumber } from './formatNumber';
import type { UpgradePanel, UpgradePanelMachineId } from './UpgradePanel';

// DOM-Kontextmenü für einen einzelnen Automaten-Slot in der HallScene (Phase
// 5, mit dem Nutzer abgestimmt): "Spielen" / "Upgrades & Boosts" für
// freigeschaltete Automaten, "Freischalten" für den nächsten in der
// Reihenfolge (siehe hall/UnlockLogic.ts). Kein eigener uiState-Eintrag
// nötig — das Overlay blockt Klicks auf die HallScene rein optisch/physisch
// (voll deckend, hoher z-index), analog zu UpgradePanel/HallPanel.
export class HallContextMenu {
  private readonly root: HTMLDivElement;
  private readonly box: HTMLDivElement;
  private currentMachineNumber: number | null = null;

  constructor(
    private readonly store: StateStore,
    private readonly upgradePanel: UpgradePanel,
    private readonly onPlay: (sceneKey: string) => void,
  ) {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed; inset:0; display:none; align-items:center; justify-content:center; ' +
      'background:rgba(10,10,10,0.85); font-family:monospace; color:#fff; z-index:25;';

    this.box = document.createElement('div');
    this.box.style.cssText =
      'background:#1e1e1e; border:2px solid #444; border-radius:8px; padding:24px; width:320px; ' +
      'max-width:90vw; display:flex; flex-direction:column; gap:10px;';
    this.root.appendChild(this.box);

    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) {
        this.close();
      }
    });

    document.body.appendChild(this.root);
  }

  openFor(machineNumber: number): void {
    this.currentMachineNumber = machineNumber;
    this.render();
    this.root.style.display = 'flex';
  }

  close(): void {
    this.currentMachineNumber = null;
    this.root.style.display = 'none';
  }

  private render(): void {
    if (this.currentMachineNumber === null) {
      return;
    }
    const entry = getMachineCatalogEntry(this.currentMachineNumber);
    const state = this.store.getState();
    this.box.innerHTML = '';

    const heading = document.createElement('h3');
    heading.textContent = `Automat ${entry.number}: ${entry.name}`;
    heading.style.cssText = 'margin:0 0 4px; font-size:18px;';
    this.box.appendChild(heading);

    const genre = document.createElement('div');
    genre.textContent = entry.genre;
    genre.style.cssText = 'font-size:13px; color:#bbb; margin-bottom:8px;';
    this.box.appendChild(genre);

    if (!entry.sceneKey) {
      this.appendNote('Noch nicht verfügbar.');
      this.appendButton('Schließen', true, () => this.close());
      return;
    }

    if (isMachineUnlocked(state.unlockedMachines, entry.number)) {
      this.appendButton('Spielen', true, () => {
        this.close();
        this.onPlay(entry.sceneKey!);
      });
      this.appendButton('Upgrades & Boosts', true, () => {
        this.close();
        this.upgradePanel.open(entry.number as UpgradePanelMachineId);
      });
      this.appendButton('Schließen', true, () => this.close());
      return;
    }

    const nextLocked = getNextLockedMachine(state.unlockedMachines);
    if (entry.number !== nextLocked) {
      this.appendNote(`Erst nach Automat ${entry.number - 1} verfügbar.`);
      this.appendButton('Schließen', true, () => this.close());
      return;
    }

    const cost = getUnlockCost(entry.number, state.hallUpgrades);
    const affordable = canUnlockMachine(state.unlockedMachines, state.hallCredits, entry.number, state.hallUpgrades);
    this.appendNote(`Freischaltkosten: ${formatNumber(cost)} Hallen-Credits`);
    this.appendButton(affordable ? 'Freischalten' : 'Noch zu teuer', affordable, () => {
      this.store.emit({ type: 'machineUnlocked', machineNumber: entry.number });
      this.render();
    });
    this.appendButton('Schließen', true, () => this.close());
  }

  private appendNote(text: string): void {
    const note = document.createElement('div');
    note.textContent = text;
    note.style.cssText = 'font-size:13px; color:#bbb;';
    this.box.appendChild(note);
  }

  private appendButton(label: string, enabled: boolean, onClick: () => void): void {
    const button = document.createElement('button');
    button.textContent = label;
    button.disabled = !enabled;
    button.style.cssText =
      `padding:8px 12px; font-family:monospace; cursor:${enabled ? 'pointer' : 'not-allowed'}; ` +
      `color:${enabled ? '#ffffff' : '#777777'}; background:${enabled ? '#2d6a2d' : '#2a2a2a'}; ` +
      `border:1px solid ${enabled ? '#4a934a' : '#3a3a3a'}; border-radius:4px;`;
    button.addEventListener('click', onClick);
    this.box.appendChild(button);
  }
}
