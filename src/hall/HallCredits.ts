import { Decimal } from '../core/BigNumber';
import type { HallUpgradeLevels } from '../state/GameState';
import { HALL_CREDITS_SHARE_OF_MACHINE_CURRENCY } from '../config/balance';
import { computeHallCreditsShareMultiplier } from './HallUpgrades';

// Hallen-Credits-Aggregation aus allen aktiven Automaten (SPECIFICATION.md
// Abschnitt 3/6, DOCS/IMPLEMENTATION_PLAN.md Phase 4). Nimmt bewusst nur die
// bereits gutgeschriebene Automaten-Ressource entgegen statt eines
// machineId-Sonderfalls — funktioniert dadurch unverändert für Automat 2+
// (Phase 5/6), sobald die runCompleted-Events aus deren Scenes eintreffen.
export function computeHallCreditsFromMachineCurrency(
  machineCurrencyEarned: Decimal,
  hallUpgrades: HallUpgradeLevels,
): Decimal {
  const share = HALL_CREDITS_SHARE_OF_MACHINE_CURRENCY * computeHallCreditsShareMultiplier(hallUpgrades);
  return machineCurrencyEarned.mul(share).floor().max(0);
}
