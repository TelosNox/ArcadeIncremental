import Decimal, { type DecimalSource } from 'break_infinity.js';

// Einziger Importpunkt für break_infinity.js im gesamten Projekt (CLAUDE.md:
// "break_infinity.js durchgängig für alle Ressourcen- und Fortschrittszahlen").
// Andere Module importieren Decimal ausschließlich von hier statt direkt aus
// dem Package, damit Konstruktion/Serialisierung an einer Stelle bleibt.
export { Decimal };
export type { DecimalSource };

export const ZERO: Decimal = new Decimal(0);

export function toSerializable(value: Decimal): string {
  return value.toString();
}

export function fromSerializable(value: string): Decimal {
  return Decimal.fromString(value);
}
