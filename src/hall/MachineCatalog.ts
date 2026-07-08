// Statische Metadaten zu allen 8 Automaten-Konzepten (SPECIFICATION.md
// Abschnitt 7) — Grundlage für die HallScene-Kacheln und das Kontextmenü.
// sceneKey ist `undefined`, solange die jeweilige Automaten-Scene noch nicht
// existiert (DOCS/IMPLEMENTATION_PLAN.md Phase 6 füllt Automat 3-8 nach und
// nach auf) — HallScene/HallContextMenu zeigen diese Slots als "noch nicht
// verfügbar" statt eine Freischaltung anzubieten, die im Spiel nirgendwo
// hinführen würde.
export interface MachineCatalogEntry {
  number: number;
  name: string;
  genre: string;
  sceneKey?: string;
}

export const MACHINE_CATALOG: readonly MachineCatalogEntry[] = [
  { number: 1, name: 'Whac-a-Mole', genre: 'Reflex-Tester', sceneKey: 'WhackAMoleScene' },
  { number: 2, name: 'Shooter', genre: 'Space-Invaders-Shooter', sceneKey: 'ShooterScene' },
  { number: 3, name: 'Arkanoid', genre: 'Breakout' },
  { number: 4, name: 'Rhythmus-Automat', genre: 'DDR-Stil' },
  { number: 5, name: 'Endless Runner', genre: 'Ausdauer' },
  { number: 6, name: 'Match-3-Puzzle', genre: 'Mustererkennung' },
  { number: 7, name: 'Greifautomat', genre: 'Claw Machine' },
  { number: 8, name: 'Pinball', genre: 'Physik-Finale' },
];

export function getMachineCatalogEntry(machineNumber: number): MachineCatalogEntry {
  const entry = MACHINE_CATALOG.find((candidate) => candidate.number === machineNumber);
  if (!entry) {
    throw new Error(`Unbekannter Automat: ${machineNumber}`);
  }
  return entry;
}
