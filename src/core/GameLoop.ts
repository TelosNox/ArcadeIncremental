export type TickListener = (deltaMs: number, timestamp: number) => void;

// Idle-Kern-Tick-Loop mit Delta-Time (DOCS/IMPLEMENTATION_PLAN.md Phase 1).
// tick() enthält die reine, testbare Delta-Berechnung; start()/stop() sind
// dünne requestAnimationFrame-Verdrahtung darüber.
export class GameLoop {
  private rafHandle: number | null = null;
  private lastTimestamp: number | null = null;
  private readonly listeners = new Set<TickListener>();

  onTick(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  tick(timestamp: number): number {
    const deltaMs = this.lastTimestamp === null ? 0 : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    for (const listener of this.listeners) {
      listener(deltaMs, timestamp);
    }
    return deltaMs;
  }

  reset(): void {
    this.lastTimestamp = null;
  }

  start(): void {
    if (this.rafHandle !== null) {
      return;
    }
    this.reset();
    const step = (timestamp: number): void => {
      this.tick(timestamp);
      this.rafHandle = requestAnimationFrame(step);
    };
    this.rafHandle = requestAnimationFrame(step);
  }

  stop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.reset();
  }

  get isRunning(): boolean {
    return this.rafHandle !== null;
  }
}
