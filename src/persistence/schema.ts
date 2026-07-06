// Save-Schema und Migrationslogik (DOCS/IMPLEMENTATION_PLAN.md Phase 1).
// migrations ist nach Ausgangsversion indiziert: migrations[fromVersion] hebt
// einen Save von genau `fromVersion` auf `fromVersion + 1`.

export const CURRENT_SAVE_VERSION = 2;

interface SerializedGameStateV1 {
  hallCredits: string;
  lastTickAt: number;
}

export interface SerializedGameState {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  state: SerializedGameState;
}

export type Migration = (oldState: unknown) => unknown;

// v1 -> v2: Automat 1 (Whac-a-Mole) führt reflexPunkte als eigene Automaten-
// Ressource ein (SPECIFICATION.md Abschnitt 3). Bestandssaves starten bei 0.
function migrateV1ToV2(oldState: unknown): unknown {
  return {
    ...(oldState as SerializedGameStateV1),
    reflexPunkte: '0',
  };
}

// migrations[fromVersion] hebt einen Save von genau `fromVersion` auf
// `fromVersion + 1`. Index 0 bleibt leer: es gab nie eine Version 0, das
// erste jemals gespeicherte Schema war bereits Version 1.
export const migrations: readonly Migration[] = (() => {
  const steps: Migration[] = [];
  steps[1] = migrateV1ToV2;
  return steps;
})();

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
