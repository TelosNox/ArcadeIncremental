import { Decimal } from '../../core/BigNumber';

// Score-zu-Credits-Umrechnung (SPECIFICATION.md Abschnitt 4a), gemeinsame
// Logik für alle Automaten. Ergebnis wird auf 0 geclampt: negative Score-
// Ergebnisse (z. B. durch viele Fehlversuche) sollen keine negativen Credits
// erzeugen — in der Spezifikation nicht explizit geregelt, sinnvolle Annahme.
export function scoreToCredits(score: Decimal, divisor: number): Decimal {
  const raw = score.div(divisor).floor();
  return raw.max(0);
}
