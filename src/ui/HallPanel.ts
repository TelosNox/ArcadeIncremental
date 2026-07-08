import { getHallUpgradeCost, getHallUpgradeMaxLevel, HALL_UPGRADE_DEFINITIONS } from '../hall/HallUpgrades';
import type { Decimal } from '../core/BigNumber';
import type { HallUpgradeLevels } from '../state/GameState';
import type { StateStore } from '../state/StateStore';
import { formatNumber } from './formatNumber';

// Hallen-Verwaltung (Phase 4/5, SPECIFICATION.md Abschnitt 6): DOM-Overlay
// wie UpgradePanel, zeigt seit der HallScene-Einführung (Phase 5, mit dem
// Nutzer abgestimmt) nur noch die zwei Hallen-weiten Upgrades
// (Hallen-Sammler, Automaten-Rabatt) — Freischaltungen wanderten ins
// HallContextMenu pro Slot, Support-Boosts ins UpgradePanel pro Automat
// (sonst wird die Liste zu groß). Selbstverwaltete Sichtbarkeit
// (open()/close()) statt eines eigenen uiState-Eintrags: das Panel ist nur
// von innerhalb der HallScene erreichbar, kein Konflikt mit anderen Scenes.
export class HallPanel {
  private readonly root: HTMLDivElement;
  private readonly cardsContainer: HTMLDivElement;
  private lastHallUpgrades: HallUpgradeLevels;
  private lastHallCredits: Decimal;

  constructor(private readonly store: StateStore) {
    this.lastHallUpgrades = store.getState().hallUpgrades;
    this.lastHallCredits = store.getState().hallCredits;

    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed; inset:0; display:none; align-items:center; justify-content:center; ' +
      'background:rgba(10,10,10,0.92); font-family:monospace; color:#fff; z-index:20;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#1e1e1e; border:2px solid #444; border-radius:8px; padding:24px; width:480px; max-width:90vw;';

    const heading = document.createElement('h2');
    heading.textContent = 'Hallen-Verwaltung';
    heading.style.cssText = 'margin:0 0 16px; font-size:20px;';
    panel.appendChild(heading);

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.style.cssText = 'display:flex; flex-direction:column; gap:12px;';
    panel.appendChild(this.cardsContainer);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Schließen';
    closeButton.style.cssText =
      'margin-top:20px; padding:8px 16px; font-family:monospace; cursor:pointer; width:100%;';
    closeButton.addEventListener('click', () => this.close());
    panel.appendChild(closeButton);

    this.root.appendChild(panel);
    document.body.appendChild(this.root);

    this.store.subscribe((state) => {
      // Gleicher Klick-vs-Rerender-Guard wie in UpgradePanel.
      if (state.hallCredits === this.lastHallCredits && state.hallUpgrades === this.lastHallUpgrades) {
        return;
      }
      this.lastHallCredits = state.hallCredits;
      this.lastHallUpgrades = state.hallUpgrades;
      if (this.root.style.display !== 'none') {
        this.render();
      }
    });
    this.render();
  }

  open(): void {
    this.render();
    this.root.style.display = 'flex';
  }

  close(): void {
    this.root.style.display = 'none';
  }

  private render(): void {
    const state = this.store.getState();
    this.cardsContainer.innerHTML = '';

    const creditsLine = document.createElement('div');
    creditsLine.textContent = `Hallen-Credits: ${formatNumber(state.hallCredits)}`;
    creditsLine.style.cssText = 'font-weight:bold; margin-bottom:4px;';
    this.cardsContainer.appendChild(creditsLine);

    for (const definition of HALL_UPGRADE_DEFINITIONS) {
      const level = state.hallUpgrades[definition.id];
      const maxLevel = getHallUpgradeMaxLevel(definition.id);
      const atMax = maxLevel !== undefined && level >= maxLevel;
      const cost = getHallUpgradeCost(definition.id, level);
      const affordable = !atMax && state.hallCredits.gte(cost);

      const card = document.createElement('div');
      card.style.cssText =
        'border:1px solid #333; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:6px;';

      const title = document.createElement('div');
      title.textContent = `${definition.name} (Stufe ${level}${maxLevel !== undefined ? `/${maxLevel}` : ''})`;
      title.style.cssText = 'font-weight:bold;';
      card.appendChild(title);

      const effect = document.createElement('div');
      effect.textContent = definition.describeEffect(level);
      effect.style.cssText = 'font-size:13px; color:#bbb;';
      card.appendChild(effect);

      const buyButton = document.createElement('button');
      buyButton.textContent = atMax ? 'Max. Stufe erreicht' : `Kaufen — ${formatNumber(cost)} Hallen-Credits`;
      buyButton.disabled = !affordable;
      buyButton.style.cssText =
        `padding:6px 12px; font-family:monospace; cursor:${affordable ? 'pointer' : 'not-allowed'}; ` +
        `color:${affordable ? '#ffffff' : '#777777'}; background:${affordable ? '#2d6a2d' : '#2a2a2a'}; ` +
        `border:1px solid ${affordable ? '#4a934a' : '#3a3a3a'}; border-radius:4px;`;
      buyButton.addEventListener('click', () => {
        if (!affordable) {
          return;
        }
        this.store.emit({ type: 'hallUpgradePurchased', upgradeId: definition.id });
      });
      card.appendChild(buyButton);

      this.cardsContainer.appendChild(card);
    }
  }
}
