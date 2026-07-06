import { describe, expect, it, vi } from 'vitest';
import { Decimal } from '../../src/core/BigNumber';
import { createInitialGameState } from '../../src/state/GameState';
import { StateStore } from '../../src/state/StateStore';

describe('StateStore', () => {
  it('starts with the given initial state', () => {
    const store = new StateStore(createInitialGameState(1000));

    expect(store.getState().hallCredits.eq(0)).toBe(true);
    expect(store.getState().lastTickAt).toBe(1000);
  });

  it('applies hallCreditsAdded events without mutating the previous state object', () => {
    const initial = createInitialGameState(0);
    const store = new StateStore(initial);

    store.emit({ type: 'hallCreditsAdded', amount: new Decimal(50) });

    expect(store.getState().hallCredits.eq(50)).toBe(true);
    expect(initial.hallCredits.eq(0)).toBe(true);
  });

  it('accumulates multiple hallCreditsAdded events', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({ type: 'hallCreditsAdded', amount: new Decimal(10) });
    store.emit({ type: 'hallCreditsAdded', amount: new Decimal(5) });

    expect(store.getState().hallCredits.eq(15)).toBe(true);
  });

  it('advances lastTickAt on tick events', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({ type: 'tick', deltaMs: 16, timestamp: 16 });

    expect(store.getState().lastTickAt).toBe(16);
  });

  it('notifies subscribers with the new state after each emitted event', () => {
    const store = new StateStore(createInitialGameState(0));
    const seen: number[] = [];
    store.subscribe((state) => seen.push(state.lastTickAt));

    store.emit({ type: 'tick', deltaMs: 10, timestamp: 10 });
    store.emit({ type: 'tick', deltaMs: 10, timestamp: 20 });

    expect(seen).toEqual([10, 20]);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const store = new StateStore(createInitialGameState(0));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.emit({ type: 'tick', deltaMs: 1, timestamp: 1 });
    unsubscribe();
    store.emit({ type: 'tick', deltaMs: 1, timestamp: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
