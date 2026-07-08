import * as Machine01Upgrades from '../arcade/machines/machine01-whackamole/upgrades';
import { SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL } from '../arcade/machines/machine01-whackamole/config';
import * as Machine02Upgrades from '../arcade/machines/machine02-shooter/upgrades';
import type { Decimal } from '../core/BigNumber';
import { getSupportBoostCost, getSupportBoostMaxLevel, SUPPORT_BOOST_DEFINITIONS } from '../hall/SupportBoosts';
import type { GameState } from '../state/GameState';
import type { StateStore } from '../state/StateStore';
import { formatNumber } from './formatNumber';
import type { UIStateController } from './UIState';

export type UpgradePanelMachineId = 1 | 2;

// Automaten-spezifische Bindings, damit render() maschinenunabhängig bleibt
// (siehe Klassenkommentar) — pro Automat: welche Ressource bezahlt lokale
// Upgrades, welche Upgrade-Liste/Kostenfunktion gilt, welches Event kauft
// welchen Upgrade-/Boost-Typ. `id as never` in den Bindings unten ist
// bewusst: MachineBinding muss über zwei Automaten mit unterschiedlichen
// Upgrade-Id-Unions hinweg denselben Funktionstyp haben; jede Bindung
// bekommt ihre Ids nur aus der eigenen upgradeDefinitions-Liste, die Typen
// passen also zur Laufzeit immer zusammen.
interface MachineBinding {
  resourceLabel: string;
  getResource: (state: GameState) => Decimal;
  upgradeDefinitions: readonly { id: string; name: string; describeEffect: (level: number) => string }[];
  getUpgradeLevel: (state: GameState, upgradeId: string) => number;
  getUpgradeCost: (upgradeId: string, level: number) => Decimal;
  getUpgradeMaxLevel: (upgradeId: string) => number | undefined;
  purchaseUpgrade: (upgradeId: string) => { type: 'machine01UpgradePurchased' | 'machine02UpgradePurchased'; upgradeId: never };
  getSupportBoostLevel: (state: GameState, boostId: string) => number;
  purchaseSupportBoost: (
    boostId: string,
  ) => { type: 'machine01SupportBoostPurchased' | 'machine02SupportBoostPurchased'; boostId: never };
  // Überschreibt die generische Effektbeschreibung aus SUPPORT_BOOST_DEFINITIONS
  // für Boosts, deren Wirkung sich zwischen Automaten unterscheidet (aktuell
  // nur "slowMotion" — Automat 1: längere Mole-Sichtbarkeit, Automat 2: mehr
  // Leben, siehe hall/SupportBoosts.ts).
  describeSupportBoostEffectOverrides?: Partial<Record<string, (level: number) => string>>;
}

const BINDINGS: Record<UpgradePanelMachineId, MachineBinding> = {
  1: {
    resourceLabel: 'Reflex-Punkte',
    getResource: (state) => state.reflexPunkte,
    upgradeDefinitions: Machine01Upgrades.UPGRADE_DEFINITIONS,
    getUpgradeLevel: (state, id) => state.machine01Upgrades[id as keyof GameState['machine01Upgrades']],
    getUpgradeCost: (id, level) => Machine01Upgrades.getUpgradeCost(id as never, level),
    getUpgradeMaxLevel: (id) => Machine01Upgrades.getUpgradeMaxLevel(id as never),
    purchaseUpgrade: (id) => ({ type: 'machine01UpgradePurchased', upgradeId: id as never }),
    getSupportBoostLevel: (state, id) => state.machine01SupportBoosts[id as keyof GameState['machine01SupportBoosts']],
    purchaseSupportBoost: (id) => ({ type: 'machine01SupportBoostPurchased', boostId: id as never }),
    describeSupportBoostEffectOverrides: {
      slowMotion: (level) => `Moles bleiben +${level * SLOW_MOTION_MOLE_VISIBLE_BONUS_MS_PER_LEVEL}ms sichtbar`,
    },
  },
  2: {
    resourceLabel: 'Abschüsse',
    getResource: (state) => state.abschuesse,
    upgradeDefinitions: Machine02Upgrades.UPGRADE_DEFINITIONS,
    getUpgradeLevel: (state, id) => state.machine02Upgrades[id as keyof GameState['machine02Upgrades']],
    getUpgradeCost: (id, level) => Machine02Upgrades.getUpgradeCost(id as never, level),
    getUpgradeMaxLevel: (id) => Machine02Upgrades.getUpgradeMaxLevel(id as never),
    purchaseUpgrade: (id) => ({ type: 'machine02UpgradePurchased', upgradeId: id as never }),
    getSupportBoostLevel: (state, id) => state.machine02SupportBoosts[id as keyof GameState['machine02SupportBoosts']],
    purchaseSupportBoost: (id) => ({ type: 'machine02SupportBoostPurchased', boostId: id as never }),
    describeSupportBoostEffectOverrides: {
      slowMotion: (level) => `+${level} Leben`,
    },
  },
};

// DOM-Overlay (kein Phaser), SPECIFICATION.md Abschnitt 10: Karten-Liste
// (Name, Level, Effektbeschreibung, Kosten), direkter Klick-Kauf ohne
// Bestätigungsdialog. Nicht leistbare Upgrades: Button ausgegraut, Preis in
// gedämpfter statt roter Farbe — kein Fehlerzustand, nur "noch nicht genug
// Credits".
//
// Seit Phase 5 (HallScene) gibt es eine einzige, geteilte Panel-Instanz für
// alle Automaten statt einer Kopie pro Automat — open(machineId) legt fest,
// wessen lokale Upgrades UND Support-Boosts gerade angezeigt werden. Das
// löst gleichzeitig die "Support-Boosts pro Automat, sonst wird die Liste zu
// groß"-Anforderung: Boosts stehen im selben Panel wie die lokalen Upgrades
// des jeweiligen Automaten statt in einer separaten Hallen-weiten Liste
// (siehe dazu die geschrumpfte HallPanel.ts).
export class UpgradePanel {
  private readonly root: HTMLDivElement;
  private readonly cardsContainer: HTMLDivElement;
  private currentMachineId: UpgradePanelMachineId = 1;
  private lastState: GameState;

  constructor(
    private readonly store: StateStore,
    private readonly uiState: UIStateController,
  ) {
    this.lastState = store.getState();

    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed; inset:0; display:none; align-items:center; justify-content:center; ' +
      'background:rgba(10,10,10,0.92); font-family:monospace; color:#fff; z-index:20;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#1e1e1e; border:2px solid #444; border-radius:8px; padding:24px; width:480px; ' +
      'max-width:90vw; max-height:85vh; overflow-y:auto;';

    const heading = document.createElement('h2');
    heading.textContent = 'Upgrades';
    heading.style.cssText = 'margin:0 0 16px; font-size:20px;';
    panel.appendChild(heading);

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.style.cssText = 'display:flex; flex-direction:column; gap:12px;';
    panel.appendChild(this.cardsContainer);

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Weiterspielen';
    continueButton.style.cssText =
      'margin-top:20px; padding:8px 16px; font-family:monospace; cursor:pointer; width:100%;';
    continueButton.addEventListener('click', () => this.uiState.setState('idle'));
    panel.appendChild(continueButton);

    this.root.appendChild(panel);
    document.body.appendChild(this.root);

    this.uiState.subscribe((state) => {
      this.root.style.display = state === 'upgrade' ? 'flex' : 'none';
      if (state === 'upgrade') {
        this.render();
      }
    });
    this.store.subscribe((state) => {
      // Der Store feuert bei jedem Event, auch bei den ~60/s Tick-Events des
      // GameLoop. Ohne diesen Guard würde render() den kompletten
      // Button-Baum ständig neu aufbauen, während das Panel offen ist —
      // ein Klick (mousedown+mouseup auf demselben Element) trifft dann oft
      // ein bereits ersetztes Element und wird nie als "click" ausgelöst.
      if (
        state.reflexPunkte === this.lastState.reflexPunkte &&
        state.abschuesse === this.lastState.abschuesse &&
        state.machine01Upgrades === this.lastState.machine01Upgrades &&
        state.machine02Upgrades === this.lastState.machine02Upgrades &&
        state.machine01SupportBoosts === this.lastState.machine01SupportBoosts &&
        state.machine02SupportBoosts === this.lastState.machine02SupportBoosts
      ) {
        return;
      }
      this.lastState = state;
      if (this.uiState.getState() === 'upgrade') {
        this.render();
      }
    });
    this.render();
  }

  // Von den Automaten-Scenes aufgerufen (siehe ArcadeSceneBase/WhackAMoleScene/
  // ShooterScene) statt uiState.setState('upgrade') direkt — legt zusätzlich
  // fest, wessen Upgrades/Boosts gerade angezeigt werden.
  open(machineId: UpgradePanelMachineId): void {
    this.currentMachineId = machineId;
    this.uiState.setState('upgrade');
  }

  private render(): void {
    const state = this.store.getState();
    const binding = BINDINGS[this.currentMachineId];
    this.cardsContainer.innerHTML = '';

    const resource = binding.getResource(state);
    for (const definition of binding.upgradeDefinitions) {
      const level = binding.getUpgradeLevel(state, definition.id);
      const maxLevel = binding.getUpgradeMaxLevel(definition.id);
      const atMax = maxLevel !== undefined && level >= maxLevel;
      const cost = binding.getUpgradeCost(definition.id, level);
      const affordable = !atMax && resource.gte(cost);

      this.renderCard({
        title: `${definition.name} (Stufe ${level}${maxLevel !== undefined ? `/${maxLevel}` : ''})`,
        effect: definition.describeEffect(level),
        atMax,
        costLabel: `Kaufen — ${formatNumber(cost)} ${binding.resourceLabel}`,
        affordable,
        onBuy: () => this.store.emit(binding.purchaseUpgrade(definition.id)),
      });
    }

    this.renderSectionHeading('Support-Boosts (mit Hallen-Credits finanziert)');
    for (const definition of SUPPORT_BOOST_DEFINITIONS) {
      const level = binding.getSupportBoostLevel(state, definition.id);
      const maxLevel = getSupportBoostMaxLevel(definition.id);
      const atMax = maxLevel !== undefined && level >= maxLevel;
      const cost = getSupportBoostCost(definition.id, level);
      const affordable = !atMax && state.hallCredits.gte(cost);
      const describeEffect = binding.describeSupportBoostEffectOverrides?.[definition.id] ?? definition.describeEffect;

      this.renderCard({
        title: `${definition.name} (Stufe ${level}${maxLevel !== undefined ? `/${maxLevel}` : ''})`,
        effect: describeEffect(level),
        atMax,
        costLabel: `Kaufen — ${formatNumber(cost)} Hallen-Credits`,
        affordable,
        onBuy: () => this.store.emit(binding.purchaseSupportBoost(definition.id)),
      });
    }
  }

  private renderSectionHeading(text: string): void {
    const heading = document.createElement('div');
    heading.textContent = text;
    heading.style.cssText = 'font-weight:bold; margin-top:8px; font-size:14px; color:#c9a3ff;';
    this.cardsContainer.appendChild(heading);
  }

  private renderCard(options: {
    title: string;
    effect: string;
    atMax: boolean;
    costLabel: string;
    affordable: boolean;
    onBuy: () => void;
  }): void {
    const { title, effect, atMax, costLabel, affordable, onBuy } = options;

    const card = document.createElement('div');
    card.style.cssText =
      'border:1px solid #333; border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:6px;';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = 'font-weight:bold;';
    card.appendChild(titleEl);

    const effectEl = document.createElement('div');
    effectEl.textContent = effect;
    effectEl.style.cssText = 'font-size:13px; color:#bbb;';
    card.appendChild(effectEl);

    const buyButton = document.createElement('button');
    buyButton.textContent = atMax ? 'Max. Stufe erreicht' : costLabel;
    buyButton.disabled = !affordable;
    buyButton.style.cssText =
      `padding:6px 12px; font-family:monospace; cursor:${affordable ? 'pointer' : 'not-allowed'}; ` +
      `color:${affordable ? '#ffffff' : '#777777'}; background:${affordable ? '#2d6a2d' : '#2a2a2a'}; ` +
      `border:1px solid ${affordable ? '#4a934a' : '#3a3a3a'}; border-radius:4px;`;
    buyButton.addEventListener('click', () => {
      if (!affordable) {
        return;
      }
      onBuy();
    });
    card.appendChild(buyButton);

    this.cardsContainer.appendChild(card);
  }
}
