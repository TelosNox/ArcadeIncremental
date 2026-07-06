import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { SAVE_STORAGE_KEY, SaveManager } from '../../src/persistence/SaveManager';
import { CURRENT_SAVE_VERSION } from '../../src/persistence/schema';
import { createInitialGameState } from '../../src/state/GameState';

// Minimaler In-Memory-Ersatz für das Storage-Interface, damit die Tests ohne
// echtes localStorage/jsdom laufen (SaveManager nimmt Storage per Konstruktor
// entgegen, siehe SaveManager.ts).
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  keys(): string[] {
    return Array.from(this.data.keys());
  }
}

describe('SaveManager', () => {
  let storage: MemoryStorage;
  let manager: SaveManager;

  beforeEach(() => {
    storage = new MemoryStorage();
    manager = new SaveManager(storage);
  });

  it('reports "empty" when nothing has been saved yet', () => {
    expect(manager.load()).toEqual({ status: 'empty' });
  });

  it('round-trips a saved state, including numbers beyond native precision', () => {
    const state = createInitialGameState(12345);
    state.hallCredits = new Decimal('1e50');
    state.reflexPunkte = new Decimal('2e30');
    state.machine01Upgrades = {
      schnellereReflexe: 2,
      groessererHammer: 1,
      scoreMultiplikator: 3,
      verlaengerteRunde: 1,
      fehlerverzeihung: 0,
    };
    state.machine01RunCount = 7;
    state.machine01TotalScore = new Decimal('420');
    state.machine01HasBroken = true;
    manager.save(state, 99999);

    const result = manager.load();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.state.hallCredits.eq(new Decimal('1e50'))).toBe(true);
      expect(result.state.reflexPunkte.eq(new Decimal('2e30'))).toBe(true);
      expect(result.state.lastTickAt).toBe(12345);
      expect(result.state.machine01Upgrades).toEqual(state.machine01Upgrades);
      expect(result.state.machine01RunCount).toBe(7);
      expect(result.state.machine01TotalScore.eq(420)).toBe(true);
      expect(result.state.machine01HasBroken).toBe(true);
    }
  });

  it('migrates a v1 save (vor Einführung von reflexPunkte/Upgrades) auf das aktuelle Schema', () => {
    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ version: 1, savedAt: 1, state: { hallCredits: '10', lastTickAt: 500 } }),
    );

    const result = manager.load();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.state.hallCredits.eq(10)).toBe(true);
      expect(result.state.reflexPunkte.eq(0)).toBe(true);
      expect(result.state.lastTickAt).toBe(500);
      expect(result.state.machine01RunCount).toBe(0);
      expect(result.state.machine01TotalScore.eq(0)).toBe(true);
      expect(result.state.machine01HasBroken).toBe(false);
      expect(result.state.machine01Upgrades.scoreMultiplikator).toBe(0);
    }
  });

  it('migrates a v2 save (vor Einführung von Upgrades/Break-Tracking) auf das aktuelle Schema', () => {
    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        savedAt: 1,
        state: { hallCredits: '0', reflexPunkte: '25', lastTickAt: 900 },
      }),
    );

    const result = manager.load();

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.state.reflexPunkte.eq(25)).toBe(true);
      expect(result.state.machine01RunCount).toBe(0);
      expect(result.state.machine01HasBroken).toBe(false);
    }
  });

  it('refuses to load a save from a newer, unknown version without touching the original blob', () => {
    const raw = JSON.stringify({
      version: CURRENT_SAVE_VERSION + 1,
      savedAt: 1,
      state: { hallCredits: '0', lastTickAt: 0 },
    });
    storage.setItem(SAVE_STORAGE_KEY, raw);

    const result = manager.load();

    expect(result.status).toBe('refused');
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(raw);
    expect(storage.keys().some((key) => key.includes('backup'))).toBe(true);
  });

  it('resets with a warning and a backup when no migration path exists for an older version', () => {
    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({ version: -1, savedAt: 1, state: { hallCredits: '0', lastTickAt: 0 } }),
    );

    const result = manager.load();

    expect(result.status).toBe('reset');
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(storage.keys().some((key) => key.includes('backup'))).toBe(true);
  });

  it('resets with a warning and a backup when the stored JSON is corrupted', () => {
    storage.setItem(SAVE_STORAGE_KEY, '{not valid json');

    const result = manager.load();

    expect(result.status).toBe('reset');
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    expect(storage.keys().some((key) => key.includes('backup'))).toBe(true);
  });
});
