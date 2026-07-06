import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from '../../src/core/GameLoop';

describe('GameLoop', () => {
  it('reports zero delta on the very first tick', () => {
    const loop = new GameLoop();
    expect(loop.tick(1000)).toBe(0);
  });

  it('computes deltaMs between successive ticks', () => {
    const loop = new GameLoop();
    loop.tick(1000);
    expect(loop.tick(1016)).toBe(16);
    expect(loop.tick(1032)).toBe(16);
  });

  it('notifies all subscribed listeners with deltaMs and timestamp', () => {
    const loop = new GameLoop();
    const received: Array<[number, number]> = [];
    loop.onTick((deltaMs, timestamp) => received.push([deltaMs, timestamp]));

    loop.tick(0);
    loop.tick(20);

    expect(received).toEqual([
      [0, 0],
      [20, 20],
    ]);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const loop = new GameLoop();
    const listener = vi.fn();
    const unsubscribe = loop.onTick(listener);

    loop.tick(0);
    unsubscribe();
    loop.tick(16);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh delta history after reset()', () => {
    const loop = new GameLoop();
    loop.tick(1000);
    loop.tick(1016);

    loop.reset();

    expect(loop.tick(5000)).toBe(0);
  });

  describe('start/stop (requestAnimationFrame-Verdrahtung)', () => {
    let rafCallbacks: FrameRequestCallback[];
    let handleCounter: number;
    let cancelSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      rafCallbacks = [];
      handleCounter = 0;
      cancelSpy = vi.fn();
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return ++handleCounter;
      });
      vi.stubGlobal('cancelAnimationFrame', cancelSpy);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('schedules exactly one frame on start() and marks the loop as running', () => {
      const loop = new GameLoop();
      loop.start();

      expect(loop.isRunning).toBe(true);
      expect(rafCallbacks).toHaveLength(1);
    });

    it('reschedules itself on every frame', () => {
      const loop = new GameLoop();
      loop.start();

      const firstFrame = rafCallbacks[0];
      firstFrame(16);

      expect(rafCallbacks).toHaveLength(2);
    });

    it('is idempotent while already running', () => {
      const loop = new GameLoop();
      loop.start();
      loop.start();

      expect(rafCallbacks).toHaveLength(1);
    });

    it('cancels the pending frame and stops on stop()', () => {
      const loop = new GameLoop();
      loop.start();
      loop.stop();

      expect(loop.isRunning).toBe(false);
      expect(cancelSpy).toHaveBeenCalledWith(1);
    });
  });
});
