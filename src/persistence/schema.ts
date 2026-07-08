// Save-Schema und Migrationslogik (DOCS/IMPLEMENTATION_PLAN.md Phase 1).
// migrations ist nach Ausgangsversion indiziert: migrations[fromVersion] hebt
// einen Save von genau `fromVersion` auf `fromVersion + 1`.

export const CURRENT_SAVE_VERSION = 6;

interface SerializedGameStateV1 {
  hallCredits: string;
  lastTickAt: number;
}

interface SerializedGameStateV2 {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
}

// "fehlerverzeihung" (reduzierte Strafe pro verpasster Mole) ist entfallen,
// seit Strafpunkte komplett aus allen Automaten entfernt wurden (mit dem
// Nutzer abgestimmt) — siehe migrateV5ToV6 unten für Bestandssaves.
export interface SerializedMachine01UpgradeLevels {
  schnellereReflexe: number;
  groessererHammer: number;
  scoreMultiplikator: number;
  verlaengerteRunde: number;
}

// Eingefroren: Form von SerializedMachine01UpgradeLevels vor v6 (mit
// "fehlerverzeihung"), ausschließlich für migrateV5ToV6.
interface SerializedMachine01UpgradeLevelsV5 {
  schnellereReflexe: number;
  groessererHammer: number;
  scoreMultiplikator: number;
  verlaengerteRunde: number;
  fehlerverzeihung: number;
}

export interface SerializedHallUpgradeLevels {
  hallenSammler: number;
  automatenRabatt: number;
}

// Generisch statt pro Automat (Phase 5, siehe state/GameState.ts:
// SupportBoostLevels) — jeder Automat führt sein eigenes Boost-Level-Set
// mit identischer Form.
export interface SerializedSupportBoostLevels {
  trainer: number;
  slowMotion: number;
  kopfstart: number;
}

// "zielcomputer" (reduzierte Fehlschuss-Strafe) ist aus demselben Grund
// entfallen wie "fehlerverzeihung" oben.
export interface SerializedMachine02UpgradeLevels {
  schnellfeuer: number;
  breiterKanonenkopf: number;
  scoreMultiplikator: number;
  verstaerkterRumpf: number;
}

// Eingefroren: Form von SerializedMachine02UpgradeLevels vor v6 (mit
// "zielcomputer"), ausschließlich für migrateV5ToV6.
interface SerializedMachine02UpgradeLevelsV5 {
  schnellfeuer: number;
  breiterKanonenkopf: number;
  scoreMultiplikator: number;
  verstaerkterRumpf: number;
  zielcomputer: number;
}

interface SerializedGameStateV3 {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
  machine01Upgrades: SerializedMachine01UpgradeLevels;
  machine01RunCount: number;
  machine01TotalScore: string;
  machine01HasBroken: boolean;
}

interface SerializedGameStateV4 {
  hallCredits: string;
  reflexPunkte: string;
  lastTickAt: number;
  machine01Upgrades: SerializedMachine01UpgradeLevels;
  machine01RunCount: number;
  machine01TotalScore: string;
  machine01HasBroken: boolean;
  unlockedMachines: number[];
  hallUpgrades: SerializedHallUpgradeLevels;
  machine01SupportBoosts: SerializedSupportBoostLevels;
}

// Eingefroren: Form von SerializedGameState vor v6 (Machine01/02-Upgrades
// noch mit Strafpunkte-Upgrades), ausschließlich für migrateV5ToV6.
interface SerializedGameStateV5 {
  hallCredits: string;
  reflexPunkte: string;
  abschuesse: string;
  lastTickAt: number;
  machine01Upgrades: SerializedMachine01UpgradeLevelsV5;
  machine01RunCount: number;
  machine01TotalScore: string;
  machine01HasBroken: boolean;
  machine02Upgrades: SerializedMachine02UpgradeLevelsV5;
  unlockedMachines: number[];
  hallUpgrades: SerializedHallUpgradeLevels;
  machine01SupportBoosts: SerializedSupportBoostLevels;
  machine02SupportBoosts: SerializedSupportBoostLevels;
}

export interface SerializedGameState {
  hallCredits: string;
  reflexPunkte: string;
  abschuesse: string;
  lastTickAt: number;
  machine01Upgrades: SerializedMachine01UpgradeLevels;
  machine01RunCount: number;
  machine01TotalScore: string;
  machine01HasBroken: boolean;
  machine02Upgrades: SerializedMachine02UpgradeLevels;
  unlockedMachines: number[];
  hallUpgrades: SerializedHallUpgradeLevels;
  machine01SupportBoosts: SerializedSupportBoostLevels;
  machine02SupportBoosts: SerializedSupportBoostLevels;
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

// v3 -> v4: Hallen-Layer hinzugefügt (SPECIFICATION.md Abschnitt 6, Phase 4:
// Freischaltungen, Hallen-Upgrades, Support-Boosts). Bestandssaves starten
// mit nur Automat 1 freigeschaltet und allen neuen Leveln bei 0.
function migrateV3ToV4(oldState: unknown): unknown {
  return {
    ...(oldState as SerializedGameStateV3),
    unlockedMachines: [1],
    hallUpgrades: {
      hallenSammler: 0,
      automatenRabatt: 0,
    },
    machine01SupportBoosts: {
      trainer: 0,
      slowMotion: 0,
      kopfstart: 0,
    },
  };
}

// v4 -> v5: Automat 2 (Shooter) hinzugefügt (SPECIFICATION.md Abschnitt 7,
// Phase 5). Bestandssaves starten ohne Abschüsse, alle Upgrade-/Boost-Level
// bei 0 — Automat 2 ist ohnehin erst nach Freischaltung bespielbar.
function migrateV4ToV5(oldState: unknown): unknown {
  return {
    ...(oldState as SerializedGameStateV4),
    abschuesse: '0',
    machine02Upgrades: {
      schnellfeuer: 0,
      breiterKanonenkopf: 0,
      scoreMultiplikator: 0,
      verstaerkterRumpf: 0,
      zielcomputer: 0,
    },
    machine02SupportBoosts: {
      trainer: 0,
      slowMotion: 0,
      kopfstart: 0,
    },
  };
}

// v5 -> v6: Strafpunkte komplett aus allen Automaten entfernt (mit dem
// Nutzer abgestimmt: Strafpunkte wirken kontraproduktiv aufs Spielerlebnis).
// "fehlerverzeihung" (Automat 1) und "zielcomputer" (Automat 2) reduzierten
// ausschließlich eine Strafe, die es nicht mehr gibt — bereits investierte
// Level werden ersatzlos fallen gelassen (kein Refund, reine Balance-
// Entscheidung, kein Datenfehler).
function migrateV5ToV6(oldState: unknown): unknown {
  const state = oldState as SerializedGameStateV5;
  const { fehlerverzeihung: _fehlerverzeihung, ...machine01Upgrades } = state.machine01Upgrades;
  const { zielcomputer: _zielcomputer, ...machine02Upgrades } = state.machine02Upgrades;
  return {
    ...state,
    machine01Upgrades,
    machine02Upgrades,
  };
}

// migrations[fromVersion] hebt einen Save von genau `fromVersion` auf
// `fromVersion + 1`. Index 0 bleibt leer: es gab nie eine Version 0, das
// erste jemals gespeicherte Schema war bereits Version 1.
export const migrations: readonly Migration[] = (() => {
  const steps: Migration[] = [];
  steps[1] = migrateV1ToV2;
  steps[2] = migrateV2ToV3;
  steps[3] = migrateV3ToV4;
  steps[4] = migrateV4ToV5;
  steps[5] = migrateV5ToV6;
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
