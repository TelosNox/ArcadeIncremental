// Save-Schema und Migrationslogik (DOCS/IMPLEMENTATION_PLAN.md Phase 1).
// migrations ist nach Ausgangsversion indiziert: migrations[fromVersion] hebt
// einen Save von genau `fromVersion` auf `fromVersion + 1`.

export const CURRENT_SAVE_VERSION = 3;

interface SerializedGameStateV1 {
  hallCredits: string;
  lastTickAt: number;
}

interface SerializedGameStateV2 {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
}

export interface SerializedMachine01UpgradeLevels {
  schnellereReflexe: number;
  groessererHammer: number;
  scoreMultiplikator: number;
  verlaengerteRunde: number;
  fehlerverzeihung: number;
}

export interface SerializedGameState {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
  machine01Upgrades: SerializedMachine01UpgradeLevels;
  machine01RunCount: number;
  machine01TotalScore: string;
  machine01HasBroken: boolean;
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

// v2 -> v3: Upgrades, Run-Zähler und Break-Flag für Automat 1 hinzugefügt
// (SPECIFICATION.md Abschnitt 4/4a). Bestandssaves starten bei Level 0,
// Run-Zähler 0, noch nicht gebrochen.
function migrateV2ToV3(oldState: unknown): unknown {
  return {
    ...(oldState as SerializedGameStateV2),
    machine01Upgrades: {
      schnellereReflexe: 0,
      groessererHammer: 0,
      scoreMultiplikator: 0,
      verlaengerteRunde: 0,
      fehlerverzeihung: 0,
    },
    machine01RunCount: 0,
    machine01TotalScore: '0',
    machine01HasBroken: false,
  };
}

// migrations[fromVersion] hebt einen Save von genau `fromVersion` auf
// `fromVersion + 1`. Index 0 bleibt leer: es gab nie eine Version 0, das
// erste jemals gespeicherte Schema war bereits Version 1.
export const migrations: readonly Migration[] = (() => {
  const steps: Migration[] = [];
  steps[1] = migrateV1ToV2;
  steps[2] = migrateV2ToV3;
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
