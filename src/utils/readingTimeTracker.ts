export interface ReadingRunState {
  wordsSet: Set<number>;
  activeMs: number;
}

export interface DwellTrackerState {
  dwellTimes: number[];
  lastIndex: number;
  lastActiveTimestamp: number | null;
  isActive: boolean;
  run: ReadingRunState;
}

export interface DwellAttributionResult {
  attributedMs: number;
  attributedWordIndex: number | null;
}

const MAX_WORD_STEP_DWELL_MS = 25000;
const MAX_TICK_OR_PAUSE_DWELL_MS = 15000;
const MIN_TICK_DWELL_MS = 100;

function ensureDwellLength(state: DwellTrackerState, totalWords: number): void {
  if (totalWords <= 0) return;
  if (state.dwellTimes.length < totalWords) {
    const oldLen = state.dwellTimes.length;
    state.dwellTimes.length = totalWords;
    for (let i = oldLen; i < totalWords; i++) {
      state.dwellTimes[i] = 0;
    }
  }
}

export function createDwellTrackerState(
  totalWords: number,
  initialIndex: number,
  initialDwellTimes?: number[]
): DwellTrackerState {
  const safeTotal = Math.max(0, totalWords);
  const dwellTimes = new Array(safeTotal).fill(0);
  if (Array.isArray(initialDwellTimes)) {
    const limit = Math.min(initialDwellTimes.length, safeTotal);
    for (let i = 0; i < limit; i++) {
      dwellTimes[i] = typeof initialDwellTimes[i] === 'number' && isFinite(initialDwellTimes[i]) && initialDwellTimes[i] > 0
        ? initialDwellTimes[i]
        : 0;
    }
  }

  return {
    dwellTimes,
    lastIndex: Math.max(0, initialIndex),
    lastActiveTimestamp: null,
    isActive: false,
    run: {
      wordsSet: new Set<number>(),
      activeMs: 0,
    },
  };
}

/**
 * Transitions active reading state (playing && !idle && !autoPaused).
 * - Pausing flushes the final active slice up to `now` and clears `lastActiveTimestamp`
 *   so zero time can ever accumulate while paused.
 * - Resuming anchors `lastActiveTimestamp` to `now` so time spent paused is never counted.
 */
export function setReadingActive(
  state: DwellTrackerState,
  active: boolean,
  now: number,
  currentIndex: number,
  totalWords: number
): DwellAttributionResult {
  if (active === state.isActive) {
    if (!active) {
      state.lastActiveTimestamp = null;
      return { attributedMs: 0, attributedWordIndex: null };
    }
    if (state.lastActiveTimestamp === null) {
      state.lastActiveTimestamp = now;
      state.lastIndex = currentIndex;
      if (currentIndex >= 0 && currentIndex < totalWords) {
        state.run.wordsSet.add(currentIndex);
      }
    }
    return { attributedMs: 0, attributedWordIndex: null };
  }

  if (active) {
    state.isActive = true;
    state.lastActiveTimestamp = now;
    state.lastIndex = currentIndex;
    if (currentIndex >= 0 && currentIndex < totalWords) {
      state.run.wordsSet.add(currentIndex);
    }
    return { attributedMs: 0, attributedWordIndex: null };
  }

  // Transitioning active -> paused: flush only the final active slice
  let attributedMs = 0;
  let attributedWordIndex: number | null = null;
  if (state.lastActiveTimestamp !== null) {
    const elapsed = now - state.lastActiveTimestamp;
    const idx = state.lastIndex;
    if (idx >= 0 && idx < totalWords && elapsed > 0 && elapsed < MAX_TICK_OR_PAUSE_DWELL_MS) {
      ensureDwellLength(state, totalWords);
      state.dwellTimes[idx] = (state.dwellTimes[idx] || 0) + elapsed;
      state.run.wordsSet.add(idx);
      state.run.activeMs += elapsed;
      attributedMs = elapsed;
      attributedWordIndex = idx;
    }
  }

  state.isActive = false;
  state.lastActiveTimestamp = null;
  return { attributedMs, attributedWordIndex };
}

/**
 * Records a word index change.
 * When paused/inactive, updates `lastIndex` only and attributes 0ms.
 */
export function recordWordIndexChange(
  state: DwellTrackerState,
  nextIndex: number,
  now: number,
  totalWords: number
): DwellAttributionResult {
  const prevIdx = state.lastIndex;
  state.lastIndex = nextIndex;

  if (!state.isActive || state.lastActiveTimestamp === null) {
    state.lastActiveTimestamp = null;
    return { attributedMs: 0, attributedWordIndex: null };
  }

  if (prevIdx === nextIndex) {
    return { attributedMs: 0, attributedWordIndex: null };
  }

  const elapsed = now - state.lastActiveTimestamp;
  state.lastActiveTimestamp = now;

  if (prevIdx >= 0 && prevIdx < totalWords && elapsed > 0 && elapsed < MAX_WORD_STEP_DWELL_MS) {
    ensureDwellLength(state, totalWords);
    state.dwellTimes[prevIdx] = (state.dwellTimes[prevIdx] || 0) + elapsed;
    state.run.wordsSet.add(prevIdx);
    if (nextIndex >= 0 && nextIndex < totalWords) {
      state.run.wordsSet.add(nextIndex);
    }
    state.run.activeMs += elapsed;
    return { attributedMs: elapsed, attributedWordIndex: prevIdx };
  }

  return { attributedMs: 0, attributedWordIndex: null };
}

/**
 * Periodic tick called only while actively reading to update live dwell time.
 */
export function recordActiveTick(
  state: DwellTrackerState,
  currentIndex: number,
  now: number,
  totalWords: number
): DwellAttributionResult {
  if (!state.isActive || state.lastActiveTimestamp === null) {
    return { attributedMs: 0, attributedWordIndex: null };
  }

  const elapsed = now - state.lastActiveTimestamp;
  if (currentIndex >= 0 && currentIndex < totalWords && elapsed >= MIN_TICK_DWELL_MS && elapsed < MAX_TICK_OR_PAUSE_DWELL_MS) {
    ensureDwellLength(state, totalWords);
    state.dwellTimes[currentIndex] = (state.dwellTimes[currentIndex] || 0) + elapsed;
    state.run.wordsSet.add(currentIndex);
    state.run.activeMs += elapsed;
    state.lastActiveTimestamp = now;
    return { attributedMs: elapsed, attributedWordIndex: currentIndex };
  }

  return { attributedMs: 0, attributedWordIndex: null };
}

/**
 * Resets the current run accumulator (e.g. on restart or new document).
 */
export function resetReadingRun(
  state: DwellTrackerState,
  currentIndex: number,
  now: number
): void {
  state.run = {
    wordsSet: new Set<number>(),
    activeMs: 0,
  };
  state.lastIndex = Math.max(0, currentIndex);
  state.lastActiveTimestamp = state.isActive ? now : null;
}

/**
 * Computes actual measured WPM from words read and active reading duration.
 */
export function calculateActualWpm(
  wordsRead: number,
  activeMs: number,
  fallbackWpm: number
): number {
  if (wordsRead <= 0 || activeMs < 50) {
    return Math.max(1, Math.round(fallbackWpm));
  }
  const rawWpm = wordsRead / (activeMs / 60000);
  return Math.max(1, Math.min(2000, Math.round(rawWpm)));
}
