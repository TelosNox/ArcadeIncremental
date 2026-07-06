import type { UIState, UIStateController } from './UIState';

// Platzhalter-Cutscene für den Blind/Reveal-Twist (SPECIFICATION.md
// Abschnitt 1/4/10) — Text + Fade reicht fürs Erste, Feinschliff
// (Choreografie, visueller Polish) ist ausdrücklich spätere Aufgabe. Keine
// Sound-Effekte (Nicht-Ziel, Abschnitt 11).
export class RevealSequence {
  private readonly root: HTMLDivElement;

  constructor(private readonly uiState: UIStateController) {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed; inset:0; display:none; align-items:center; justify-content:center; ' +
      'flex-direction:column; gap:24px; background:#000; color:#fff; font-family:monospace; ' +
      'text-align:center; padding:32px; z-index:30; opacity:0; transition:opacity 1.2s ease-in;';

    const text = document.createElement('div');
    text.style.cssText = 'font-size:24px; max-width:640px; line-height:1.6;';
    text.textContent =
      'Der Automat verstummt. Licht flammt auf — du stehst nicht mehr allein vor einem ' +
      'Spielautomaten. Um dich herum erstreckt sich eine ganze Spielhalle.';
    this.root.appendChild(text);

    const continueButton = document.createElement('button');
    continueButton.textContent = 'Weiter';
    continueButton.style.cssText = 'padding:10px 24px; font-family:monospace; cursor:pointer;';
    continueButton.addEventListener('click', () => this.uiState.setState('idle'));
    this.root.appendChild(continueButton);

    document.body.appendChild(this.root);

    this.uiState.subscribe((state) => this.updateVisibility(state));
  }

  private updateVisibility(state: UIState): void {
    if (state === 'reveal') {
      this.root.style.display = 'flex';
      requestAnimationFrame(() => {
        this.root.style.opacity = '1';
      });
      return;
    }

    this.root.style.opacity = '0';
    window.setTimeout(() => {
      if (this.uiState.getState() !== 'reveal') {
        this.root.style.display = 'none';
      }
    }, 300);
  }
}
