import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTROLS_ACTIVITY_EVENTS,
  DEFAULT_CONTROLS_IDLE_TIMEOUT_MS,
  createControlsIdleController,
  shouldAutoHideControls,
} from '../useControlsIdle';

class FakeEventTarget {
  private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') {
        listener({ type } as Event);
      } else {
        listener.handleEvent({ type } as Event);
      }
    }
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeClock {
  private nextId = 1;
  private now = 0;
  private timers = new Map<number, { fireAt: number; fn: () => void }>();

  api = {
    setTimeout: (fn: () => void, ms: number) => {
      const id = this.nextId++;
      this.timers.set(id, { fireAt: this.now + ms, fn });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      this.timers.delete(id as unknown as number);
    },
  };

  advance(ms: number) {
    const target = this.now + ms;
    while (true) {
      let earliestId: number | null = null;
      let earliestFireAt = Infinity;
      for (const [id, entry] of this.timers.entries()) {
        if (entry.fireAt <= target && entry.fireAt < earliestFireAt) {
          earliestId = id;
          earliestFireAt = entry.fireAt;
        }
      }
      if (earliestId === null) break;
      const entry = this.timers.get(earliestId)!;
      this.timers.delete(earliestId);
      this.now = entry.fireAt;
      entry.fn();
    }
    this.now = target;
  }

  pendingCount(): number {
    return this.timers.size;
  }
}

test('shouldAutoHideControls only enables auto-hide during active playback without open modals', () => {
  assert.equal(shouldAutoHideControls({ isPlaying: false, isAnyModalOpen: false }), false);
  assert.equal(shouldAutoHideControls({ isPlaying: false, isAnyModalOpen: true }), false);
  assert.equal(shouldAutoHideControls({ isPlaying: true, isAnyModalOpen: true }), false);
  assert.equal(shouldAutoHideControls({ isPlaying: true, isAnyModalOpen: false }), true);
});

test('controls never fade out while reading is paused', () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();
  const changes: boolean[] = [];

  const controller = createControlsIdleController({
    idleTimeoutMs: DEFAULT_CONTROLS_IDLE_TIMEOUT_MS,
    onIdleChange: (next) => changes.push(next),
    target,
    timers: clock.api,
  });

  controller.update({ isPlaying: false, isAnyModalOpen: false });
  clock.advance(60_000);

  assert.equal(controller.getIsIdle(), false);
  assert.deepEqual(changes, []);
  assert.equal(clock.pendingCount(), 0);
  for (const eventName of CONTROLS_ACTIVITY_EVENTS) {
    assert.equal(target.listenerCount(eventName), 0);
  }

  controller.dispose();
});

test('controls fade out after inactivity only while playing and restore immediately on pause', () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();
  const changes: boolean[] = [];

  const controller = createControlsIdleController({
    idleTimeoutMs: 5000,
    onIdleChange: (next) => changes.push(next),
    target,
    timers: clock.api,
  });

  controller.update({ isPlaying: true, isAnyModalOpen: false });
  clock.advance(4999);
  assert.equal(controller.getIsIdle(), false);

  clock.advance(1);
  assert.equal(controller.getIsIdle(), true);
  assert.deepEqual(changes, [true]);

  // Pausing reading must immediately show controls and keep them visible
  controller.update({ isPlaying: false, isAnyModalOpen: false });
  assert.equal(controller.getIsIdle(), false);
  assert.deepEqual(changes, [true, false]);

  clock.advance(30_000);
  assert.equal(controller.getIsIdle(), false);
  assert.equal(clock.pendingCount(), 0);

  controller.dispose();
});

test('pointer or keyboard activity wakes faded controls and resets timer while playing', () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();
  const changes: boolean[] = [];

  const controller = createControlsIdleController({
    idleTimeoutMs: 5000,
    onIdleChange: (next) => changes.push(next),
    target,
    timers: clock.api,
  });

  controller.update({ isPlaying: true, isAnyModalOpen: false });
  clock.advance(5000);
  assert.equal(controller.getIsIdle(), true);

  // First click / pointerdown wakes controls immediately
  target.dispatch('pointerdown');
  assert.equal(controller.getIsIdle(), false);

  clock.advance(4000);
  assert.equal(controller.getIsIdle(), false);

  clock.advance(1000);
  assert.equal(controller.getIsIdle(), true);
  assert.deepEqual(changes, [true, false, true]);

  controller.dispose();
});

test('opening a modal while playing immediately restores controls and prevents fading', () => {
  const clock = new FakeClock();
  const target = new FakeEventTarget();

  const controller = createControlsIdleController({
    idleTimeoutMs: 5000,
    onIdleChange: () => {},
    target,
    timers: clock.api,
  });

  controller.update({ isPlaying: true, isAnyModalOpen: false });
  clock.advance(5000);
  assert.equal(controller.getIsIdle(), true);

  controller.update({ isPlaying: true, isAnyModalOpen: true });
  assert.equal(controller.getIsIdle(), false);

  clock.advance(20_000);
  assert.equal(controller.getIsIdle(), false);

  controller.dispose();
});

test('faded controls never disable pointer events or translate hit targets out from under the cursor', () => {
  const files = [
    'src/components/Header.tsx',
    'src/components/RSVPReader.tsx',
    'src/components/FlowReader.tsx',
    'src/components/DocumentSidebar.tsx',
  ];

  for (const relPath of files) {
    const content = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
    const idleTernaries = content.match(/isIdle\s*\?[^\n]+/g) ?? [];
    assert.ok(idleTernaries.length > 0, `Expected isIdle class binding in ${relPath}`);

    for (const line of idleTernaries) {
      assert.equal(
        line.includes('pointer-events-none'),
        false,
        `Found pointer-events-none in isIdle branch in ${relPath}: ${line}`
      );
      assert.equal(
        line.includes('translate-'),
        false,
        `Found positional translate shift in isIdle branch in ${relPath}: ${line}`
      );
    }
  }
});
