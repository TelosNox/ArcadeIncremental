import { Decimal } from '../core/BigNumber';

// Zentrale Formatierung für alle im UI angezeigten Zahlen (Score, Automaten-
// Ressourcen, Hallen-Credits) — kein rohes toString() auf Decimal-Werten im
// UI-Code (CLAUDE.md, Code-Stil). Rundet auf eine Ganzzahl, sofern nicht
// anders benötigt.
export function formatNumber(value: Decimal | number): string {
  const decimal = value instanceof Decimal ? value : new Decimal(value);
  return decimal.round().toString();
}
