// UI-Zustand (SPECIFICATION.md Abschnitt 10) — getrennt vom Spielzustand im
// StateStore. Wird von der aktiven Automaten-Scene und DOM-Overlays
// (UpgradePanel, RevealSequence) gemeinsam genutzt, um sich zu koordinieren,
// ohne dass sie sich direkt kennen müssen.
export type UIState = 'idle' | 'playing' | 'runResult' | 'upgrade' | 'reveal';

export type UIStateListener = (state: UIState) => void;

export class UIStateController {
  private state: UIState;
  private readonly listeners = new Set<UIStateListener>();

  constructor(initialState: UIState = 'idle') {
    this.state = initialState;
  }

  getState(): UIState {
    return this.state;
  }

  setState(next: UIState): void {
    if (this.state === next) {
      return;
    }
    this.state = next;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: UIStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
