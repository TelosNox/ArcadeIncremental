import { Decimal } from '../core/BigNumber';
import type { GameState } from '../state/GameState';
import {
  applyMigrations,
  CURRENT_SAVE_VERSION,
  migrations,
  type SaveFile,
  type SerializedGameState,
} from './schema';

export const SAVE_STORAGE_KEY = 'incremental-arcade-hall:save';
const BACKUP_KEY_PREFIX = 'incremental-arcade-hall:save-backup';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'refused'; reason: string }
  | { status: 'reset'; reason: string };

// Persistenz über localStorage (DOCS/IMPLEMENTATION_PLAN.md Phase 1). Storage
// ist injizierbar, damit Tests ohne echtes localStorage/jsdom laufen.
export class SaveManager {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  save(state: GameState, savedAt: number = Date.now()): void {
    const saveFile: SaveFile = {
      version: CURRENT_SAVE_VERSION,
      savedAt,
      state: serialize(state),
    };
    this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveFile));
  }

  load(): LoadResult {
    const raw = this.storage.getItem(SAVE_STORAGE_KEY);
    if (raw === null) {
      return { status: 'empty' };
    }

    let parsed: SaveFile;
    try {
      parsed = JSON.parse(raw) as SaveFile;
    } catch {
      return this.resetWithBackup(raw, 'unbekannt', 'Save-Datei ist beschädigt (kein gültiges JSON).');
    }

    if (parsed.version > CURRENT_SAVE_VERSION) {
      // Neuer als bekannt: Laden verweigern, nie stillschweigend zurücksetzen.
      // Blob bleibt unverändert erhalten, zusätzlich Backup-Kopie zur Sicherheit.
      this.storage.setItem(`${BACKUP_KEY_PREFIX}-v${parsed.version}`, raw);
      return {
        status: 'refused',
        reason: `Save-Datei stammt von Version ${parsed.version}, dieses Spiel kennt nur bis Version ${CURRENT_SAVE_VERSION}.`,
      };
    }

    const migration = applyMigrations(parsed.state, parsed.version, CURRENT_SAVE_VERSION, migrations);
    if (!migration.ok) {
      return this.resetWithBackup(raw, String(parsed.version), migration.error);
    }

    return { status: 'ok', state: deserialize(migration.state as SerializedGameState) };
  }

  private resetWithBackup(raw: string, fromVersionLabel: string, reason: string): LoadResult {
    this.storage.setItem(`${BACKUP_KEY_PREFIX}-${fromVersionLabel}-${Date.now()}`, raw);
    this.storage.removeItem(SAVE_STORAGE_KEY);
    return { status: 'reset', reason };
  }
}

function serialize(state: GameState): SerializedGameState {
  return {
    hallCredits: state.hallCredits.toString(),
    reflexPunkte: state.reflexPunkte.toString(),
    lastTickAt: state.lastTickAt,
    machine01Upgrades: { ...state.machine01Upgrades },
    machine01RunCount: state.machine01RunCount,
    machine01TotalScore: state.machine01TotalScore.toString(),
    machine01HasBroken: state.machine01HasBroken,
  };
}

function deserialize(state: SerializedGameState): GameState {
  return {
    hallCredits: Decimal.fromString(state.hallCredits),
    reflexPunkte: Decimal.fromString(state.reflexPunkte),
    lastTickAt: state.lastTickAt,
    machine01Upgrades: { ...state.machine01Upgrades },
    machine01RunCount: state.machine01RunCount,
    machine01TotalScore: Decimal.fromString(state.machine01TotalScore),
    machine01HasBroken: state.machine01HasBroken,
  };
}
