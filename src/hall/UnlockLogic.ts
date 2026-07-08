import { Decimal } from '../core/BigNumber';
import type { HallUpgradeLevels } from '../state/GameState';
import { HALL_UNLOCK_COST_BASIS, HALL_UNLOCK_COST_GROWTH, TOTAL_MACHINE_COUNT } from '../config/balance';
import { computeUnlockCostMultiplier } from './HallUpgrades';

// Freischaltkosten-Formel (SPECIFICATION.md Abschnitt 6):
// Freischaltkosten(n) = 50 × 3^(n-1), abgerundet auf den Automaten-Rabatt-
// Multiplikator angewendet (siehe hall/HallUpgrades.ts).
export function getUnlockCost(machineNumber: number, hallUpgrades: HallUpgradeLevels): Decimal {
  const base = new Decimal(HALL_UNLOCK_COST_BASIS).mul(Decimal.pow(HALL_UNLOCK_COST_GROWTH, machineNumber - 1));
  return base.mul(computeUnlockCostMultiplier(hallUpgrades)).round();
}

export function isMachineUnlocked(unlockedMachines: readonly number[], machineNumber: number): boolean {
  return unlockedMachines.includes(machineNumber);
}

// Sinnvolle Annahme (Spezifikationslücke, kein expliziter Reihenfolgezwang in
// Abschnitt 6): Automaten schalten sich sequenziell frei, analog zur bewusst
// aufsteigenden Skill-Reihenfolge aus Abschnitt 7 — Automat n setzt voraus,
// dass Automat n-1 bereits freigeschaltet ist.
export function canUnlockMachine(
  unlockedMachines: readonly number[],
  hallCredits: Decimal,
  machineNumber: number,
  hallUpgrades: HallUpgradeLevels,
): boolean {
  if (machineNumber < 2 || machineNumber > TOTAL_MACHINE_COUNT) {
    return false;
  }
  if (isMachineUnlocked(unlockedMachines, machineNumber)) {
    return false;
  }
  if (!isMachineUnlocked(unlockedMachines, machineNumber - 1)) {
    return false;
  }
  return hallCredits.gte(getUnlockCost(machineNumber, hallUpgrades));
}

// Nächster noch nicht freigeschalteter Automat in der festen Reihenfolge
// (Abschnitt 7) — undefined, wenn bereits alle acht freigeschaltet sind.
export function getNextLockedMachine(unlockedMachines: readonly number[]): number | undefined {
  for (let n = 2; n <= TOTAL_MACHINE_COUNT; n++) {
    if (!isMachineUnlocked(unlockedMachines, n)) {
      return n;
    }
  }
  return undefined;
}
