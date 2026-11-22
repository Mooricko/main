/**
 * Tests for Smart Auto-Pause Feature & Transition-State Play Intent Queuing
 */

import {
  AutoPauseReason,
  createSmartAutoPauseController,
  DEFAULT_MOUSE_EXIT_GRACE_MS,
  DEFAULT_RESUME_GRACE_MS,
  DEFAULT_TRANSITION_SETTLE_MS,
} from '../useSmartAutoPause';

// Mock DOM environment for Node test runner
class MockEventTarget {
  private listeners: Record<string, Function[]> = {};

  addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  removeEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }

  dispatchEvent(event: string, payload: any = {}) {
    if (!this.listeners[event]) return;
    for (const fn of [...this.listeners[event]]) {
      fn(payload);
    }
  }

  getListenerCount(event: string): number {
    return this.listeners[event]?.length || 0;
  }
}

class FakeClock {
  private nextId = 1;
  nowMs = 1000;
  private timers = new Map<number, { fireAt: number; fn: () => void }>();

  api = {
    setTimeout: (fn: () => void, ms: number) => {
      const id = this.nextId++;
      this.timers.set(id, { fireAt: this.nowMs + ms, fn });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      this.timers.delete(id as unknown as number);
    },
  };

  now = () => this.nowMs;

  advance(ms: number) {
    const target = this.nowMs + ms;
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
      this.nowMs = entry.fireAt;
      entry.fn();
    }
    this.nowMs = target;
  }
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    testsFailed++;
  }
}

function createMockEnv() {
  const win = new MockEventTarget() as any;
  win.innerWidth = 1024;
  win.innerHeight = 768;

  const docElem = new MockEventTarget() as any;
  const doc = new MockEventTarget() as any;
  doc.hidden = false;
  doc.focused = true;
  doc.hasFocus = () => doc.focused;
  doc.documentElement = docElem;

  return { win, doc, docElem };
}

console.log('=============================================');
console.log('🧪 Testing Smart Auto-Pause Logic');
console.log('=============================================');

console.log('\n--- 1. Window Blur & Tab Switching ---');
{
  const { win, doc, docElem } = createMockEnv();
  const clock = new FakeClock();
  let isPlaying = true;
  let enabled = true;
  let pauseTriggeredReason: AutoPauseReason | null = null;

  const controller = createSmartAutoPauseController({
    getIsPlaying: () => isPlaying,
    getEnabled: () => enabled,
    onAutoPause: (reason) => {
      pauseTriggeredReason = reason;
    },
    win,
    doc,
    docElem,
    now: clock.now,
    timers: clock.api,
  });

  // Trigger window blur while playing
  win.dispatchEvent('blur');
  assert(pauseTriggeredReason === 'blur', 'Triggers auto-pause on window blur when reader is active');

  // Reset
  clock.advance(DEFAULT_TRANSITION_SETTLE_MS + 10);
  pauseTriggeredReason = null;
  isPlaying = false;

  // Trigger window blur while reader is NOT playing
  win.dispatchEvent('blur');
  assert(pauseTriggeredReason === null, 'Does not trigger auto-pause when reader is already paused');

  // Trigger window blur when feature is disabled
  isPlaying = true;
  enabled = false;
  win.dispatchEvent('blur');
  assert(pauseTriggeredReason === null, 'Does not trigger auto-pause when smartAutoPause setting is disabled');

  controller.cleanup();
}

console.log('\n--- 2. Document Visibility Change ---');
{
  const { win, doc, docElem } = createMockEnv();
  const clock = new FakeClock();
  let isPlaying = true;
  let pauseTriggeredReason: AutoPauseReason | null = null;

  const controller = createSmartAutoPauseController({
    getIsPlaying: () => isPlaying,
    getEnabled: () => true,
    onAutoPause: (reason) => {
      pauseTriggeredReason = reason;
    },
    win,
    doc,
    docElem,
    now: clock.now,
    timers: clock.api,
  });

  // Document becomes hidden
  doc.hidden = true;
  doc.dispatchEvent('visibilitychange');
  assert(pauseTriggeredReason === 'visibility', 'Triggers auto-pause when document becomes hidden (tab switch)');

  // Reset
  clock.advance(DEFAULT_TRANSITION_SETTLE_MS + 10);
  pauseTriggeredReason = null;
  doc.hidden = false;
  doc.dispatchEvent('visibilitychange');
  assert(pauseTriggeredReason === null, 'Does not pause when document becomes visible');

  controller.cleanup();
}

console.log('\n--- 3. Mouse Leaving Window Boundary & Viewport Bounds Guard ---');
{
  const { win, doc, docElem } = createMockEnv();
  const clock = new FakeClock();
  let isPlaying = true;
  let pauseCount = 0;
  let pauseTriggeredReason: AutoPauseReason | null = null;

  const controller = createSmartAutoPauseController({
    getIsPlaying: () => isPlaying,
    getEnabled: () => true,
    onAutoPause: (reason) => {
      pauseTriggeredReason = reason;
      pauseCount++;
    },
    win,
    doc,
    docElem,
    now: clock.now,
    timers: clock.api,
  });

  // Cursor moves inside the window
  docElem.dispatchEvent('mouseleave', {
    relatedTarget: {},
    clientX: 200,
    clientY: 200,
  });
  assert(pauseTriggeredReason === null, 'Does not pause when cursor is inside window or entering another element');

  // Synthetic mouseout inside viewport (e.g., hovered Smart Auto-Paused banner unmounts)
  win.dispatchEvent('mouseout', {
    relatedTarget: null,
    toElement: null,
    clientX: 450,
    clientY: 500,
  });
  assert(pauseTriggeredReason === null, 'Ignores mouseout inside viewport caused by DOM unmount under cursor');

  // Cursor moves above the top edge (e.g., towards tabs or address bar)
  docElem.dispatchEvent('mouseleave', {
    relatedTarget: null,
    clientX: 300,
    clientY: -5,
  });
  assert(
    pauseTriggeredReason === null && controller.hasPendingMouseExitPause() === true,
    'Does NOT pause immediately on mouse exit; starts grace period countdown'
  );

  // Brief excursion: cursor returns before grace period expires -> cancels auto-pause!
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS - 100);
  docElem.dispatchEvent('mouseenter');
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS + 100);
  assert(
    pauseTriggeredReason === null && pauseCount === 0 && controller.hasPendingMouseExitPause() === false,
    'Cancels pending auto-pause when cursor re-enters viewport (mouseenter) within grace period'
  );

  // Brief excursion cancelled via mousemove inside viewport (even if mouseenter does not fire)
  win.dispatchEvent('mouseout', {
    relatedTarget: null,
    toElement: null,
    clientX: -2,
    clientY: 200,
  });
  clock.advance(Math.floor(DEFAULT_MOUSE_EXIT_GRACE_MS / 2));
  doc.dispatchEvent('mousemove', { clientX: 120, clientY: 200 });
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS + 100);
  assert(
    pauseTriggeredReason === null && pauseCount === 0,
    'Cancels pending auto-pause when mouse moves back inside viewport (mousemove) within grace period'
  );

  // Sustained exit beyond grace period triggers auto-pause (and deduplicates mouseleave + mouseout)
  docElem.dispatchEvent('mouseleave', {
    relatedTarget: null,
    clientX: 300,
    clientY: -5,
  });
  win.dispatchEvent('mouseout', {
    relatedTarget: null,
    toElement: null,
    clientX: 300,
    clientY: -5,
  });
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS - 1);
  assert(pauseTriggeredReason === null, 'Still does not pause 1ms before mouse-exit grace expires');
  clock.advance(1);
  assert(
    pauseTriggeredReason === 'mouse' && pauseCount === 1,
    'Triggers single auto-pause when cursor stays outside viewport past grace period'
  );

  // Reset after tick settles
  clock.advance(DEFAULT_TRANSITION_SETTLE_MS + 10);
  pauseTriggeredReason = null;

  // Cursor leaves via right window edge and stays outside
  docElem.dispatchEvent('mouseleave', {
    relatedTarget: null,
    clientX: 1200,
    clientY: 300,
  });
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS);
  assert(pauseTriggeredReason === 'mouse', 'Triggers auto-pause when cursor stays past right window boundary');

  // Reset after tick settles
  clock.advance(DEFAULT_TRANSITION_SETTLE_MS + 10);
  pauseTriggeredReason = null;

  // Mouseout without coordinates (synthetic browser/test event outside window)
  win.dispatchEvent('mouseout', {
    relatedTarget: null,
    toElement: null,
  });
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS);
  assert(pauseTriggeredReason === 'mouse', 'Triggers auto-pause on window mouseout after grace period');

  // Reset and verify blur preempts pending mouse-exit timer immediately without double-firing
  clock.advance(DEFAULT_TRANSITION_SETTLE_MS + 10);
  pauseTriggeredReason = null;
  const countBeforeBlur = pauseCount;
  docElem.dispatchEvent('mouseleave', { relatedTarget: null, clientX: 300, clientY: -5 });
  clock.advance(100);
  win.dispatchEvent('blur');
  assert(
    pauseTriggeredReason === 'blur' && pauseCount === countBeforeBlur + 1,
    'Window blur pauses immediately without waiting for mouse-exit grace'
  );
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS + 100);
  assert(
    pauseCount === countBeforeBlur + 1,
    'Window blur cancels pending mouse-exit timer so auto-pause never double-fires'
  );

  controller.cleanup();
}

console.log('\n--- 4. Queuing Play Intent During Auto-Pause & Unfocused Window Transitions ---');
{
  const { win, doc, docElem } = createMockEnv();
  const clock = new FakeClock();
  const state = {
    isPlaying: true,
    resumeFlushes: 0,
    autoPauses: 0,
  };

  const controller = createSmartAutoPauseController({
    getIsPlaying: () => state.isPlaying,
    getEnabled: () => true,
    onAutoPause: () => {
      state.autoPauses++;
      state.isPlaying = false;
    },
    onResumeQueued: () => {
      state.resumeFlushes++;
      state.isPlaying = true;
    },
    win,
    doc,
    docElem,
    now: clock.now,
    timers: clock.api,
  });

  // Scenario A: Auto-pause fires via blur (user clicks outside window)
  doc.focused = false;
  win.dispatchEvent('blur');
  assert(state.isPlaying === false && state.autoPauses === 1, 'Auto-pauses when window blurs');
  assert(controller.isInTransition() === true, 'Reports active transition while window is unfocused');

  // User clicks Play/Resume directly into unfocused window: pointerdown fires before focus
  const queuedOnPointerDown = controller.queuePlayIfTransitioning();
  assert(queuedOnPointerDown === true, 'Queues play intent on pointerdown while window is unfocused');
  assert(controller.hasQueuedPlayIntent() === true, 'Tracks pending play intent');

  // Window regains focus -> queued play intent flushes immediately
  doc.focused = true;
  win.dispatchEvent('focus');
  assert(state.resumeFlushes === 1 && state.isPlaying === true, 'Flushes queued play intent immediately on window focus');

  // If the browser also delivers the trailing click 30ms later, toggle dedupe prevents re-pausing
  clock.advance(30);
  assert(
    controller.consumeRecentQueuedResume() === true,
    'Consumes recent queued resume guard so trailing click does not toggle playback off'
  );
  assert(
    controller.consumeRecentQueuedResume() === false,
    'Dedupe guard is single-use so subsequent pause clicks work normally'
  );

  // Spurious mouseout / blur within resume grace window does NOT immediately re-pause
  win.dispatchEvent('mouseout', { relatedTarget: null, toElement: null, clientX: -1, clientY: 100 });
  win.dispatchEvent('blur');
  assert(state.isPlaying === true && state.autoPauses === 1, 'Suppresses trailing mouseout/blur jitter during post-resume grace window');

  // After grace window expires and focus settles, genuine auto-pause works again
  win.dispatchEvent('focus');
  clock.advance(DEFAULT_RESUME_GRACE_MS + 50);
  docElem.dispatchEvent('mouseleave', { relatedTarget: null, clientX: 200, clientY: -2 });
  clock.advance(DEFAULT_MOUSE_EXIT_GRACE_MS);
  assert(state.isPlaying === false && state.autoPauses === 2, 'Triggers auto-pause normally after grace window expires');

  // Scenario B: User clicks Resume immediately within active auto-pause transition window (20ms later)
  clock.advance(20);
  const intentResult = controller.requestPlay('click');
  assert(intentResult === 'queued', 'Queues click play intent when auto-pause transition is still active');
  clock.advance(0);
  assert(state.resumeFlushes === 2 && state.isPlaying === true, 'Flushes queued click intent on next tick so click is never dropped');

  // Scenario C: Cancelling queued intent while hidden prevents unintended playback on tab return
  clock.advance(DEFAULT_RESUME_GRACE_MS + 50);
  doc.hidden = true;
  doc.dispatchEvent('visibilitychange');
  assert(state.isPlaying === false && state.autoPauses === 3, 'Auto-pauses when tab becomes hidden');
  const hiddenIntent = controller.requestPlay('click');
  assert(hiddenIntent === 'queued', 'Queues play intent if requested while document is hidden');
  controller.cancelQueuedPlay();
  doc.hidden = false;
  doc.dispatchEvent('visibilitychange');
  assert(state.isPlaying === false && state.resumeFlushes === 2, 'Explicit cancelQueuedPlay prevents queued resume from firing');

  controller.cleanup();
}

console.log('\n--- 5. Cleanup & Event Listener Removal ---');
{
  const { win, doc, docElem } = createMockEnv();

  const controller = createSmartAutoPauseController({
    getIsPlaying: () => true,
    getEnabled: () => true,
    onAutoPause: () => {},
    win,
    doc,
    docElem,
  });

  assert(win.getListenerCount('blur') === 1, 'Attached blur listener on setup');
  assert(win.getListenerCount('focus') === 1, 'Attached focus listener on setup');
  assert(win.getListenerCount('mouseout') === 1, 'Attached mouseout listener on setup');
  assert(docElem.getListenerCount('mouseleave') === 1, 'Attached mouseleave listener on setup');
  assert(docElem.getListenerCount('mouseenter') === 1, 'Attached mouseenter listener on setup');
  assert(doc.getListenerCount('mousemove') === 1, 'Attached mousemove listener on setup');
  assert(doc.getListenerCount('visibilitychange') === 1, 'Attached visibilitychange listener on setup');

  controller.cleanup();

  assert(win.getListenerCount('blur') === 0, 'Removed blur listener on cleanup');
  assert(win.getListenerCount('focus') === 0, 'Removed focus listener on cleanup');
  assert(win.getListenerCount('mouseout') === 0, 'Removed mouseout listener on cleanup');
  assert(docElem.getListenerCount('mouseleave') === 0, 'Removed mouseleave listener on cleanup');
  assert(docElem.getListenerCount('mouseenter') === 0, 'Removed mouseenter listener on cleanup');
  assert(doc.getListenerCount('mousemove') === 0, 'Removed mousemove listener on cleanup');
  assert(doc.getListenerCount('visibilitychange') === 0, 'Removed visibilitychange listener on cleanup');
}

console.log('=============================================');
console.log(`🏁 Smart Auto-Pause Test Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('=============================================');

if (testsFailed > 0) {
  process.exit(1);
}
