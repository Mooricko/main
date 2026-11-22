import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDwellTrackerState,
  setReadingActive,
  recordWordIndexChange,
  recordActiveTick,
  resetReadingRun,
  calculateActualWpm,
} from '../readingTimeTracker';
import { generateReadingHeatmap } from '../readingHeatmap';
import { HighlightedWordParts } from '../../types';

function makeSampleWords(count: number): HighlightedWordParts[] {
  return Array.from({ length: count }, (_, i) => ({
    original: i % 5 === 0 ? 'extraordinary' : `word${i}`,
    prefixPunct: '',
    beforeHighlight: '',
    highlightedText: 'w',
    afterHighlight: `ord${i}`,
    suffixPunct: i % 7 === 0 ? '.' : '',
    hasSentenceEnd: i % 7 === 0,
    hasClausePause: false,
    hasParagraphBreak: false,
    index: i,
  }));
}

test('paused state never accumulates reading time or heatmap dwell, even across long waits and manual scrubbing', () => {
  const state = createDwellTrackerState(30, 0);

  // User sits paused for 10 seconds, steps words manually, and ticks fire
  assert.deepEqual(recordWordIndexChange(state, 1, 10000, 30), {
    attributedMs: 0,
    attributedWordIndex: null,
  });
  assert.deepEqual(recordWordIndexChange(state, 11, 15000, 30), {
    attributedMs: 0,
    attributedWordIndex: null,
  });
  assert.deepEqual(recordActiveTick(state, 11, 20000, 30), {
    attributedMs: 0,
    attributedWordIndex: null,
  });

  assert.equal(state.run.activeMs, 0);
  assert.equal(state.run.wordsSet.size, 0);
  assert.equal(
    state.dwellTimes.reduce((a, b) => a + b, 0),
    0
  );

  // Heatmap generated while paused with 0 dwell reports 0ms and all buckets unread
  const words = makeSampleWords(30);
  const heatmap = generateReadingHeatmap(words, state.dwellTimes, 11, 320, 30);
  assert.equal(heatmap.totalDwellMs, 0);
  assert.ok(heatmap.buckets.every((b) => b.dwellTimeMs === 0 && !b.isRead));
});

test('resuming after a long pause does not leak paused duration into dwell time or actual WPM', () => {
  const state = createDwellTrackerState(10, 0);

  // Paused from t=0 to t=12000ms
  setReadingActive(state, true, 12000, 0, 10);

  // Advance 10 words at 250ms each (actual speed = 240 WPM, even if target is 320 WPM)
  let t = 12000;
  for (let i = 1; i < 10; i++) {
    t += 250;
    const res = recordWordIndexChange(state, i, t, 10);
    assert.equal(res.attributedMs, 250);
    assert.equal(res.attributedWordIndex, i - 1);
  }

  // Pause mid-way or finish on last word after 250ms
  t += 250;
  const flushed = setReadingActive(state, false, t, 9, 10);
  assert.equal(flushed.attributedMs, 250);
  assert.equal(flushed.attributedWordIndex, 9);

  // Total active reading time = 10 * 250ms = 2500ms
  assert.equal(state.run.activeMs, 2500);
  assert.equal(state.run.wordsSet.size, 10);
  assert.equal(
    state.dwellTimes.reduce((a, b) => a + b, 0),
    2500
  );

  // Actual WPM = 10 / (2500 / 60000) = 240 WPM (distinct from target 320 WPM)
  assert.equal(calculateActualWpm(state.run.wordsSet.size, state.run.activeMs, 320), 240);

  // Waiting 30 seconds while paused on completion screen adds 0ms
  recordActiveTick(state, 9, t + 30000, 10);
  assert.equal(state.run.activeMs, 2500);
  assert.equal(
    state.dwellTimes.reduce((a, b) => a + b, 0),
    2500
  );
});

test('pausing mid-document and resuming preserves active time without counting the pause gap', () => {
  const state = createDwellTrackerState(20, 0);

  // Read words 0..4 (5 words * 200ms = 1000ms)
  setReadingActive(state, true, 1000, 0, 20);
  recordWordIndexChange(state, 1, 1200, 20);
  recordWordIndexChange(state, 2, 1400, 20);
  recordWordIndexChange(state, 3, 1600, 20);
  recordWordIndexChange(state, 4, 1800, 20);
  // Pause at t=2000 (flushes 200ms on word 4)
  setReadingActive(state, false, 2000, 4, 20);
  assert.equal(state.run.activeMs, 1000);

  // Stay paused for 20 seconds (t=2000 to t=22000)
  recordActiveTick(state, 4, 10000, 20);
  assert.equal(state.run.activeMs, 1000);

  // Resume at t=22000 and read words 5..9 (5 words * 300ms = 1500ms)
  setReadingActive(state, true, 22000, 5, 20);
  recordWordIndexChange(state, 6, 22300, 20);
  recordWordIndexChange(state, 7, 22600, 20);
  recordWordIndexChange(state, 8, 22900, 20);
  recordWordIndexChange(state, 9, 23200, 20);
  setReadingActive(state, false, 23500, 9, 20);

  // Total active time = 1000 + 1500 = 2500ms for 10 words => 240 WPM
  assert.equal(state.run.activeMs, 2500);
  assert.equal(state.run.wordsSet.size, 10);
  assert.equal(calculateActualWpm(state.run.wordsSet.size, state.run.activeMs, 400), 240);

  // Resetting run clears run metrics for a fresh Read Again pass
  resetReadingRun(state, 0, 24000);
  assert.equal(state.run.activeMs, 0);
  assert.equal(state.run.wordsSet.size, 0);
});
