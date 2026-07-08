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

  it('aggregates a share of creditsEarned into hallCredits on runCompleted (Phase 4)', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine01-whackamole',
      score: new Decimal(50),
      creditsEarned: new Decimal(10),
    });

    // 10 * 0.2 (HALL_CREDITS_SHARE_OF_MACHINE_CURRENCY) = 2
    expect(store.getState().hallCredits.eq(2)).toBe(true);
  });

  describe('hallUpgradePurchased', () => {
    it('deducts the cost and increments the level when affordable', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(200);
      const store = new StateStore(initial);

      store.emit({ type: 'hallUpgradePurchased', upgradeId: 'hallenSammler' });

      expect(store.getState().hallCredits.eq(100)).toBe(true);
      expect(store.getState().hallUpgrades.hallenSammler).toBe(1);
    });

    it('ignores the purchase when hallCredits is insufficient', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(5);
      const store = new StateStore(initial);

      store.emit({ type: 'hallUpgradePurchased', upgradeId: 'hallenSammler' });

      expect(store.getState().hallCredits.eq(5)).toBe(true);
      expect(store.getState().hallUpgrades.hallenSammler).toBe(0);
    });

    it('ignores the purchase once the max level (Automaten-Rabatt) is reached', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(1_000_000);
      initial.hallUpgrades = { ...initial.hallUpgrades, automatenRabatt: 10 };
      const store = new StateStore(initial);

      store.emit({ type: 'hallUpgradePurchased', upgradeId: 'automatenRabatt' });

      expect(store.getState().hallUpgrades.automatenRabatt).toBe(10);
      expect(store.getState().hallCredits.eq(1_000_000)).toBe(true);
    });
  });

  describe('machine01SupportBoostPurchased', () => {
    it('deducts the cost and increments the level when affordable', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(100);
      const store = new StateStore(initial);

      store.emit({ type: 'machine01SupportBoostPurchased', boostId: 'trainer' });

      expect(store.getState().hallCredits.eq(70)).toBe(true);
      expect(store.getState().machine01SupportBoosts.trainer).toBe(1);
    });

    it('ignores the purchase once the max level (slowMotion) is reached', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(1_000_000);
      initial.machine01SupportBoosts = { ...initial.machine01SupportBoosts, slowMotion: 5 };
      const store = new StateStore(initial);

      store.emit({ type: 'machine01SupportBoostPurchased', boostId: 'slowMotion' });

      expect(store.getState().machine01SupportBoosts.slowMotion).toBe(5);
    });
  });

  it('credits abschuesse on runCompleted events (Automat 2)', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine02-shooter',
      score: new Decimal(120),
      creditsEarned: new Decimal(24),
    });

    expect(store.getState().abschuesse.eq(24)).toBe(true);
    // Automat 2 hat keinen Run-Zähler/Total-Score wie Automat 1 (keine
    // Break-Bedingung, SPECIFICATION.md Abschnitt 4 gilt nur für Automat 1).
    expect(store.getState().machine01RunCount).toBe(0);
  });

  it('aggregates a share of creditsEarned into hallCredits on runCompleted (Automat 2)', () => {
    const store = new StateStore(createInitialGameState(0));

    store.emit({
      type: 'runCompleted',
      machineId: 'machine02-shooter',
      score: new Decimal(100),
      creditsEarned: new Decimal(20),
    });

    // 20 * 0.2 (HALL_CREDITS_SHARE_OF_MACHINE_CURRENCY) = 4
    expect(store.getState().hallCredits.eq(4)).toBe(true);
  });

  describe('machine02UpgradePurchased', () => {
    it('deducts the cost and increments the level when affordable', () => {
      const initial = createInitialGameState(0);
      initial.abschuesse = new Decimal(100);
      const store = new StateStore(initial);

      store.emit({ type: 'machine02UpgradePurchased', upgradeId: 'schnellfeuer' });

      // Kosten für Level 0 -> 1: 10 * 1.15^0 = 10
      expect(store.getState().abschuesse.eq(90)).toBe(true);
      expect(store.getState().machine02Upgrades.schnellfeuer).toBe(1);
    });

    it('ignores the purchase when abschuesse is insufficient (kein Minus-Guthaben)', () => {
      const initial = createInitialGameState(0);
      initial.abschuesse = new Decimal(5);
      const store = new StateStore(initial);

      store.emit({ type: 'machine02UpgradePurchased', upgradeId: 'schnellfeuer' });

      expect(store.getState().abschuesse.eq(5)).toBe(true);
      expect(store.getState().machine02Upgrades.schnellfeuer).toBe(0);
    });

    it('ignores the purchase once the upgrade-specific max level is reached', () => {
      const initial = createInitialGameState(0);
      initial.abschuesse = new Decimal(100_000);
      initial.machine02Upgrades = { ...initial.machine02Upgrades, verstaerkterRumpf: 3 };
      const store = new StateStore(initial);

      store.emit({ type: 'machine02UpgradePurchased', upgradeId: 'verstaerkterRumpf' });

      expect(store.getState().machine02Upgrades.verstaerkterRumpf).toBe(3);
      expect(store.getState().abschuesse.eq(100_000)).toBe(true);
    });
  });

  describe('machine02SupportBoostPurchased', () => {
    it('deducts the cost and increments the level when affordable', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(100);
      const store = new StateStore(initial);

      store.emit({ type: 'machine02SupportBoostPurchased', boostId: 'trainer' });

      expect(store.getState().hallCredits.eq(70)).toBe(true);
      expect(store.getState().machine02SupportBoosts.trainer).toBe(1);
      // Automat 1 bleibt unberührt (Support-Boosts sind seit Phase 5 pro
      // Automat getrennt, kein gemeinsamer Topf mehr).
      expect(store.getState().machine01SupportBoosts.trainer).toBe(0);
    });

    it('ignores the purchase once the max level (slowMotion) is reached', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(1_000_000);
      initial.machine02SupportBoosts = { ...initial.machine02SupportBoosts, slowMotion: 5 };
      const store = new StateStore(initial);

      store.emit({ type: 'machine02SupportBoostPurchased', boostId: 'slowMotion' });

      expect(store.getState().machine02SupportBoosts.slowMotion).toBe(5);
    });
  });

  describe('machineUnlocked', () => {
    it('deducts the cost and adds the machine number when unlockable', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(500);
      const store = new StateStore(initial);

      store.emit({ type: 'machineUnlocked', machineNumber: 2 });

      expect(store.getState().hallCredits.eq(350)).toBe(true);
      expect(store.getState().unlockedMachines).toEqual([1, 2]);
    });

    it('ignores the unlock when hallCredits is insufficient', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(10);
      const store = new StateStore(initial);

      store.emit({ type: 'machineUnlocked', machineNumber: 2 });

      expect(store.getState().unlockedMachines).toEqual([1]);
      expect(store.getState().hallCredits.eq(10)).toBe(true);
    });

    it('ignores the unlock when the previous machine is not yet unlocked', () => {
      const initial = createInitialGameState(0);
      initial.hallCredits = new Decimal(1_000_000);
      const store = new StateStore(initial);

      store.emit({ type: 'machineUnlocked', machineNumber: 3 });

      expect(store.getState().unlockedMachines).toEqual([1]);
    });
  });
});
