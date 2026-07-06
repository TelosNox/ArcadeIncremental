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

  it('credits reflexPunkte on runCompleted events (Automat 1)', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(85),
      creditsEarned: new Decimal(17),
    });

    expect(store.getState().reflexPunkte.eq(17)).toBe(true);
  });

  it('accumulates reflexPunkte across multiple runs', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(50),
      creditsEarned: new Decimal(10),
    });
    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(30),
      creditsEarned: new Decimal(6),
    });

    expect(store.getState().reflexPunkte.eq(16)).toBe(true);
  });

  it('tracks machine01RunCount and machine01TotalScore on runCompleted', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(40),
      creditsEarned: new Decimal(8),
    });
    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(-10),
      creditsEarned: new Decimal(0),
    });

    expect(store.getState().machine01RunCount).toBe(2);
    expect(store.getState().machine01TotalScore.eq(30)).toBe(true);
  });

  describe('machine01UpgradePurchased', () => {
    it('deducts the cost and increments the level when affordable', () => {
      const initial = createInitialGameState(0);
      initial.reflexPunkte = new Decimal(100);
      const store = new StateStore(initial);

      store.emit({ type: 'machine01UpgradePurchased', upgradeId: 'schnellereReflexe' });

      // Kosten für Level 0 -> 1: 10 * 1.15^0 = 10
      expect(store.getState().reflexPunkte.eq(90)).toBe(true);
      expect(store.getState().machine01Upgrades.schnellereReflexe).toBe(1);
    });

    it('ignores the purchase when reflexPunkte is insufficient (kein Minus-Guthaben)', () => {
      const initial = createInitialGameState(0);
      initial.reflexPunkte = new Decimal(5);
      const store = new StateStore(initial);

      store.emit({ type: 'machine01UpgradePurchased', upgradeId: 'schnellereReflexe' });

      expect(store.getState().reflexPunkte.eq(5)).toBe(true);
      expect(store.getState().machine01Upgrades.schnellereReflexe).toBe(0);
    });

    it('ignores the purchase once the upgrade-specific max level is reached', () => {
      const initial = createInitialGameState(0);
      initial.reflexPunkte = new Decimal(100_000);
      initial.machine01Upgrades = { ...initial.machine01Upgrades, verlaengerteRunde: 3 };
      const store = new StateStore(initial);

      store.emit({ type: 'machine01UpgradePurchased', upgradeId: 'verlaengerteRunde' });

      expect(store.getState().machine01Upgrades.verlaengerteRunde).toBe(3);
      expect(store.getState().reflexPunkte.eq(100_000)).toBe(true);
    });
  });

  it('sets machine01HasBroken on machine01BreakTriggered', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({ type: 'machine01BreakTriggered' });

    expect(store.getState().machine01HasBroken).toBe(true);
  });
});
