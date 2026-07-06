// Save-Schema und Migrationslogik (DOCS/IMPLEMENTATION_PLAN.md Phase 1).
// migrations ist nach Ausgangsversion indiziert: migrations[fromVersion] hebt
// einen Save von genau `fromVersion` auf `fromVersion + 1`.

export const CURRENT_SAVE_VERSION = 1;

export interface SerializedGameState {
  hallCredits: string;
  lastTickAt: number;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  state: SerializedGameState;
}

export type Migration = (oldState: unknown) => unknown;

// Noch leer: Version 1 ist das erste Schema, es gibt nichts zu migrieren.
export const migrations: readonly Migration[] = [];

export type MigrationResult =
  | { ok: true; state: unknown; reachedVersion: number }
  | { ok: false; error: string };

export function applyMigrations(
  state: unknown,
  fromVersion: number,
  toVersion: number,
  availableMigrations: readonly Migration[],
): MigrationResult {
  let current = state;
  let version = fromVersion;
  while (version < toVersion) {
    const migrate = availableMigrations[version];
    if (!migrate) {
      return { ok: false, error: `Keine Migration von Version ${version} verfügbar.` };
    }
    current = migrate(current);
    version += 1;
  }
  return { ok: true, state: current, reachedVersion: version };
}
