import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  HighlightedWordParts, 
  ReadingHeatmapData, 
  ReadingSessionRecord, 
  ReadingStatsSummary,
  WpmHistoryPoint,
  SessionSpeedProgressPoint
} from '../types';
import { generateReadingHeatmap } from '../utils/readingHeatmap';
import {
  DwellTrackerState,
  createDwellTrackerState,
  setReadingActive,
  recordWordIndexChange,
  recordActiveTick,
  resetReadingRun,
  calculateActualWpm,
} from '../utils/readingTimeTracker';
import { safeStorage } from '../utils/safeStorage';
import { formatHistoryDate } from '../components/DocumentSidebar';

const STORAGE_KEY_SESSIONS = 'adhd_reading_sessions_history_v1';
const STORAGE_KEY_CURRENT_SPEED_TREND = 'adhd_current_session_speed_trend_v1';

interface UseReadingHeatmapProps {
  words: HighlightedWordParts[];
  totalWords?: number;
  currentIndex: number;
  isPlaying: boolean;
  wpm: number;
  documentTitle: string;
  documentId?: string;
  isIdle?: boolean;
  isAutoPaused?: boolean;
  warmupStatus?: { isWarmingUp: boolean; currentWpm: number };
}

export interface ReadingRunStats {
  wordsRead: number;
  activeMs: number;
  actualWpm: number;
}

interface ActiveSessionData {
  id: string;
  startTime: number;
  wordsSet: Set<number>;
  dwellMs: number;
  targetWpm: number;
  documentTitle: string;
  speedPoints: SessionSpeedProgressPoint[];
  lastSampleDwellSec: number;
}

const formatSecToTimeLabel = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function useReadingHeatmap({
  words,
  totalWords: customTotalWords,
  currentIndex,
  isPlaying,
  wpm,
  documentTitle,
  documentId,
  isIdle = false,
  isAutoPaused = false,
  warmupStatus,
}: UseReadingHeatmapProps) {
  const effectiveTotalWords = customTotalWords ?? words.length;
  const isActivelyReading = Boolean(isPlaying && !isIdle && !isAutoPaused);

  // Storage key derived from title and length to persist across reloads
  const storageKey = useMemo(() => {
    const safeTitle = (documentTitle || 'reading').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `adhd_heatmap_dwell_${safeTitle}_${effectiveTotalWords}`;
  }, [documentTitle, effectiveTotalWords]);

  // Dwell & active run tracker (strictly accrues time only while actively reading)
  const trackerRef = useRef<DwellTrackerState>(
    createDwellTrackerState(effectiveTotalWords, currentIndex)
  );
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStorageKeyRef = useRef<string>(storageKey);
  const prevDocIdRef = useRef<string | undefined>(documentId);
  const wasAutoPausedRef = useRef<boolean>(isAutoPaused);

  // Latest prop refs to avoid re-running lifecycle effects on unrelated prop changes
  const currentIndexRef = useRef<number>(currentIndex);
  currentIndexRef.current = currentIndex;
  const wpmRef = useRef<number>(wpm);
  wpmRef.current = wpm;
  const warmupStatusRef = useRef(warmupStatus);
  warmupStatusRef.current = warmupStatus;
  const documentTitleRef = useRef<string>(documentTitle);
  documentTitleRef.current = documentTitle;
  const effectiveTotalWordsRef = useRef<number>(effectiveTotalWords);
  effectiveTotalWordsRef.current = effectiveTotalWords;
  const isActivelyReadingRef = useRef<boolean>(isActivelyReading);
  isActivelyReadingRef.current = isActivelyReading;

  // Stored historical reading sessions
  const [pastSessions, setPastSessions] = useState<ReadingSessionRecord[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return [];
  });

  // Active in-progress reading session
  const activeSessionRef = useRef<ActiveSessionData | null>(null);

  // Force an immediate state update trigger
  const [renderTick, setRenderTick] = useState<number>(0);

  // Initialize or restore dwell times when document or word count changes
  useEffect(() => {
    let loadedDwellTimes: number[] | undefined;
    try {
      const saved = safeStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedDwellTimes = parsed;
        }
      }
    } catch {
      // Ignore
    }

    const docSwitched =
      prevStorageKeyRef.current !== storageKey || prevDocIdRef.current !== documentId;
    prevStorageKeyRef.current = storageKey;
    prevDocIdRef.current = documentId;

    const adapted = new Array(Math.max(0, effectiveTotalWords)).fill(0);
    const source = loadedDwellTimes || (!docSwitched ? trackerRef.current.dwellTimes : undefined);
    if (source) {
      for (let i = 0; i < Math.min(source.length, adapted.length); i++) {
        adapted[i] = typeof source[i] === 'number' && isFinite(source[i]) && source[i] > 0 ? source[i] : 0;
      }
    }

    trackerRef.current.dwellTimes = adapted;
    if (docSwitched) {
      resetReadingRun(trackerRef.current, currentIndexRef.current, performance.now());
    }
    setRenderTick((t) => (t + 1) % 10000);
  }, [storageKey, effectiveTotalWords, documentId]);

  // Schedule safeStorage persistence (debounced)
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) return;
    saveTimeoutRef.current = setTimeout(() => {
      try {
        safeStorage.setItem(storageKey, JSON.stringify(trackerRef.current.dwellTimes));
      } catch {
        // Ignore
      }
      saveTimeoutRef.current = null;
    }, 2000);
  }, [storageKey]);

  // Finalize an active session and save to persistent history
  const finalizeActiveSession = useCallback(() => {
    const session = activeSessionRef.current;
    if (!session) return;

    if (session.speedPoints && session.speedPoints.length > 0) {
      try {
        safeStorage.setItem(STORAGE_KEY_CURRENT_SPEED_TREND, JSON.stringify(session.speedPoints));
      } catch {
        // Ignore
      }
    }

    if (session.wordsSet.size >= 4 || session.dwellMs >= 2500) {
      const durationMins = session.dwellMs / 60000;
      let calculatedWpm = durationMins > 0 
        ? Math.round(session.wordsSet.size / durationMins) 
        : session.targetWpm;

      if (calculatedWpm < 10) calculatedWpm = session.targetWpm;
      if (calculatedWpm > 1600) calculatedWpm = 1600;

      const newRecord: ReadingSessionRecord = {
        id: session.id,
        timestamp: session.startTime,
        dateLabel: formatHistoryDate(session.startTime),
        documentTitle: session.documentTitle,
        wordsRead: session.wordsSet.size,
        dwellMs: Math.round(session.dwellMs),
        averageWpm: calculatedWpm,
        targetWpm: session.targetWpm,
      };

      setPastSessions((prev) => {
        const updated = [newRecord, ...prev].slice(0, 80);
        try {
          safeStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    }

    activeSessionRef.current = null;
  }, []);

  // Helper to attribute active elapsed time to the active session & speed trend
  const attributeToActiveSession = useCallback(
    (wordIndex: number, elapsedMs: number, nextWordIndex?: number) => {
      const session = activeSessionRef.current;
      if (!session || elapsedMs <= 0) return;

      session.wordsSet.add(wordIndex);
      if (nextWordIndex !== undefined) {
        session.wordsSet.add(nextWordIndex);
      }
      session.dwellMs += elapsedMs;
      session.targetWpm = wpmRef.current;

      const currentActiveSec = Math.round(session.dwellMs / 1000);
      if (currentActiveSec >= session.lastSampleDwellSec + 2) {
        session.lastSampleDwellSec = currentActiveSec;
        const currentWpm =
          (warmupStatusRef.current?.isWarmingUp ? warmupStatusRef.current.currentWpm : wpmRef.current) || 320;
        session.speedPoints.push({
          second: currentActiveSec,
          timeLabel: formatSecToTimeLabel(currentActiveSec),
          wpm: currentWpm,
          targetWpm: wpmRef.current,
          wordsRead: session.wordsSet.size,
          wordIndex: nextWordIndex ?? wordIndex,
        });
        try {
          safeStorage.setItem(STORAGE_KEY_CURRENT_SPEED_TREND, JSON.stringify(session.speedPoints));
        } catch {
          // Ignore
        }
      }
    },
    []
  );

  // Handle active reading / pause / auto-pause transitions
  useEffect(() => {
    const now = performance.now();
    const flushed = setReadingActive(
      trackerRef.current,
      isActivelyReading,
      now,
      currentIndexRef.current,
      effectiveTotalWordsRef.current
    );

    if (flushed.attributedMs > 0 && flushed.attributedWordIndex !== null) {
      attributeToActiveSession(flushed.attributedWordIndex, flushed.attributedMs);
      scheduleSave();
      setRenderTick((t) => (t + 1) % 10000);
    }

    if (isActivelyReading) {
      const currWpm = wpmRef.current;
      const currTitle = documentTitleRef.current || 'Reading Session';
      const currIdx = currentIndexRef.current;
      if (!activeSessionRef.current) {
        const initialWpm =
          (warmupStatusRef.current?.isWarmingUp ? warmupStatusRef.current.currentWpm : currWpm) || 320;
        activeSessionRef.current = {
          id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          startTime: Date.now(),
          wordsSet: new Set([currIdx]),
          dwellMs: 0,
          targetWpm: currWpm,
          documentTitle: currTitle,
          speedPoints: [
            {
              second: 0,
              timeLabel: '0:00',
              wpm: initialWpm,
              targetWpm: currWpm,
              wordsRead: 1,
              wordIndex: currIdx,
            },
          ],
          lastSampleDwellSec: 0,
        };
      } else {
        activeSessionRef.current.targetWpm = currWpm;
        activeSessionRef.current.documentTitle = currTitle;
      }
    } else if (isAutoPaused) {
      // Keep active session paused (frozen) during smart auto-pause; record annotation once
      if (!wasAutoPausedRef.current && activeSessionRef.current) {
        const activeSec = Math.max(1, Math.round(activeSessionRef.current.dwellMs / 1000));
        const autoPausePoint: SessionSpeedProgressPoint = {
          second: activeSec,
          timeLabel: formatSecToTimeLabel(activeSec),
          wpm: 0,
          targetWpm: wpmRef.current,
          wordsRead: activeSessionRef.current.wordsSet.size,
          wordIndex: currentIndexRef.current,
          isAutoPaused: true,
          annotation: 'Auto-Paused',
        };
        activeSessionRef.current.speedPoints.push(autoPausePoint);
        try {
          safeStorage.setItem(
            STORAGE_KEY_CURRENT_SPEED_TREND,
            JSON.stringify(activeSessionRef.current.speedPoints)
          );
        } catch {
          // Ignore
        }
        setRenderTick((t) => (t + 1) % 10000);
      }
    } else {
      // Explicit pause or completion: finalize session and keep dwell timer frozen
      finalizeActiveSession();
    }

    wasAutoPausedRef.current = isAutoPaused;
  }, [
    isActivelyReading,
    isAutoPaused,
    attributeToActiveSession,
    finalizeActiveSession,
    scheduleSave,
  ]);

  // Keep active session metadata synced without touching dwell timestamps
  useEffect(() => {
    if (activeSessionRef.current) {
      activeSessionRef.current.targetWpm = wpm;
      activeSessionRef.current.documentTitle = documentTitle || 'Reading Session';
    }
  }, [wpm, documentTitle]);

  // Clean up and finalize active session when documentTitle/documentId changes or unmounts
  useEffect(() => {
    return () => {
      finalizeActiveSession();
    };
  }, [documentTitle, documentId, finalizeActiveSession]);

  // Record elapsed time ONLY when index changes during active playback (never while paused)
  useEffect(() => {
    const res = recordWordIndexChange(
      trackerRef.current,
      currentIndex,
      performance.now(),
      effectiveTotalWords
    );

    if (res.attributedMs > 0 && res.attributedWordIndex !== null) {
      attributeToActiveSession(res.attributedWordIndex, res.attributedMs, currentIndex);
      scheduleSave();
      setRenderTick((t) => (t + 1) % 10000);
    }
  }, [currentIndex, effectiveTotalWords, attributeToActiveSession, scheduleSave]);

  // Periodic ticker ONLY during active reading playback to update dwell and speed trend in real time
  useEffect(() => {
    if (!isActivelyReading || effectiveTotalWords === 0) return;

    const interval = setInterval(() => {
      const idx = currentIndexRef.current;
      const res = recordActiveTick(
        trackerRef.current,
        idx,
        performance.now(),
        effectiveTotalWords
      );

      if (res.attributedMs > 0 && res.attributedWordIndex !== null) {
        attributeToActiveSession(res.attributedWordIndex, res.attributedMs);
        scheduleSave();
        setRenderTick((t) => (t + 1) % 10000);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isActivelyReading, effectiveTotalWords, attributeToActiveSession, scheduleSave]);

  // Compute the rich heatmap data
  const heatmapData: ReadingHeatmapData = useMemo(() => {
    // Depend on renderTick, currentIndex, words, wpm, effectiveTotalWords
    return generateReadingHeatmap(
      words,
      trackerRef.current.dwellTimes,
      currentIndex,
      wpm,
      effectiveTotalWords
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, currentIndex, wpm, effectiveTotalWords, renderTick]);

  // Compute aggregated reading statistics summary using heatmap & session data
  const statsSummary: ReadingStatsSummary = useMemo(() => {
    // 1. Current document dwell metrics
    let currentDocWordsCount = 0;
    let currentDocDwellTotal = 0;

    const dwellArr = trackerRef.current.dwellTimes;
    if (dwellArr && dwellArr.length > 0) {
      for (let i = 0; i < dwellArr.length; i++) {
        const d = dwellArr[i] || 0;
        if (d > 40) {
          currentDocWordsCount++;
          currentDocDwellTotal += d;
        }
      }
    }

    const currentDocDwellMins = currentDocDwellTotal / 60000;
    const currentDocAvgWpm = currentDocDwellMins > 0 && currentDocWordsCount > 0
      ? Math.round(currentDocWordsCount / currentDocDwellMins)
      : wpm;

    // 2. Aggregate across past recorded sessions
    let pastWordsTotal = 0;
    let pastDwellTotal = 0;
    let weightedWpmSum = 0;

    for (const session of pastSessions) {
      pastWordsTotal += session.wordsRead;
      pastDwellTotal += session.dwellMs;
      weightedWpmSum += session.averageWpm * session.wordsRead;
    }

    // Include active session in progress
    const active = activeSessionRef.current;
    const activeWords = active ? active.wordsSet.size : 0;
    const activeDwell = active ? active.dwellMs : 0;
    const activeWpm = active && active.dwellMs > 1000
      ? Math.round(activeWords / (active.dwellMs / 60000))
      : wpm;

    if (active && activeWords > 0) {
      weightedWpmSum += activeWpm * activeWords;
    }

    const totalWordsRead = Math.max(
      pastWordsTotal + activeWords,
      currentDocWordsCount
    );

    const totalReadingTimeMs = Math.max(
      pastDwellTotal + activeDwell,
      currentDocDwellTotal
    );

    const totalSessionsCount = pastSessions.length + (
      active && activeWords >= 3 
        ? 1 
        : (pastSessions.length === 0 && currentDocWordsCount > 0 ? 1 : 0)
    );

    // Compute weighted overall average WPM
    let overallAverageWpm = wpm;
    const wordsWithRecordedWpm = pastWordsTotal + activeWords;
    if (wordsWithRecordedWpm > 0) {
      overallAverageWpm = Math.round(weightedWpmSum / wordsWithRecordedWpm);
    } else if (currentDocWordsCount > 0 && currentDocDwellMins > 0) {
      overallAverageWpm = currentDocAvgWpm;
    }

    // 3. Construct chronological timeline for WPM over time chart
    const chronologicalSessions = [...pastSessions].reverse();
    const wpmHistory: WpmHistoryPoint[] = chronologicalSessions.map((sess, idx) => ({
      id: sess.id,
      timestamp: sess.timestamp,
      dateLabel: sess.dateLabel,
      timeLabel: new Date(sess.timestamp).toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      sessionNumber: idx + 1,
      avgWpm: sess.averageWpm,
      targetWpm: sess.targetWpm || wpm,
      wordsRead: sess.wordsRead,
      dwellSeconds: Math.round(sess.dwellMs / 1000),
      documentTitle: sess.documentTitle || 'Document',
    }));

    // If active session or current doc has activity, append it as the latest point
    if (active && activeWords >= 3) {
      wpmHistory.push({
        id: active.id,
        timestamp: active.startTime,
        dateLabel: 'Now',
        timeLabel: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        sessionNumber: wpmHistory.length + 1,
        avgWpm: activeWpm,
        targetWpm: active.targetWpm,
        wordsRead: activeWords,
        dwellSeconds: Math.round(activeDwell / 1000),
        documentTitle: active.documentTitle,
      });
    } else if (wpmHistory.length === 0 && currentDocWordsCount > 0) {
      // First session baseline point from current document
      wpmHistory.push({
        id: 'current_session_baseline',
        timestamp: Date.now(),
        dateLabel: 'Today',
        timeLabel: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        sessionNumber: 1,
        avgWpm: currentDocAvgWpm,
        targetWpm: wpm,
        wordsRead: currentDocWordsCount,
        dwellSeconds: Math.round(currentDocDwellTotal / 1000),
        documentTitle: documentTitle || 'Current Document',
      });
    }

    // 4. Retrieve current session speed trend points
    let currentSessionSpeedTrend: SessionSpeedProgressPoint[] = [];
    if (active && active.speedPoints && active.speedPoints.length > 0) {
      currentSessionSpeedTrend = [...active.speedPoints];
    } else {
      try {
        const saved = safeStorage.getItem(STORAGE_KEY_CURRENT_SPEED_TREND);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentSessionSpeedTrend = parsed;
          }
        }
      } catch {
        // Ignore
      }
    }

    // If completely empty, generate starting anchor point
    if (currentSessionSpeedTrend.length === 0) {
      const startingWpm = (warmupStatus?.isWarmingUp ? warmupStatus.currentWpm : wpm) || 320;
      currentSessionSpeedTrend = [
        {
          second: 0,
          timeLabel: '0:00',
          wpm: startingWpm,
          targetWpm: wpm,
          wordsRead: activeWords || (currentDocWordsCount > 0 ? 1 : 0),
          wordIndex: currentIndex,
        },
      ];
    }

    const currentSessionWordsRead = active
      ? active.wordsSet.size
      : (currentSessionSpeedTrend[currentSessionSpeedTrend.length - 1]?.wordsRead || currentDocWordsCount);

    const currentSessionDwellMs = active
      ? active.dwellMs
      : ((currentSessionSpeedTrend[currentSessionSpeedTrend.length - 1]?.second || 0) * 1000 || currentDocDwellTotal);

    let currentSessionPeakWpm = currentSessionSpeedTrend.reduce((max, pt) => Math.max(max, pt.wpm), 0);
    if (currentSessionPeakWpm < 10) currentSessionPeakWpm = wpm;

    const currentSessionAvgWpm = active && active.dwellMs > 1000 && active.wordsSet.size > 0
      ? Math.round(active.wordsSet.size / (active.dwellMs / 60000))
      : (wpmHistory.length > 0 ? wpmHistory[wpmHistory.length - 1].avgWpm : wpm);

    // 5. Complexity breakdown from heatmap buckets
    let fastWords = 0;
    let steadyWords = 0;
    let complexWords = 0;
    let unreadWords = 0;

    for (const b of heatmapData.buckets) {
      const bucketWordCount = Math.max(1, b.endWord - b.startWord + 1);
      if (b.complexityLevel === 'low') fastWords += bucketWordCount;
      else if (b.complexityLevel === 'moderate') steadyWords += bucketWordCount;
      else if (b.complexityLevel === 'high' || b.complexityLevel === 'peak') complexWords += bucketWordCount;
      else unreadWords += bucketWordCount;
    }

    return {
      totalWordsRead,
      totalReadingTimeMs,
      totalSessionsCount,
      overallAverageWpm,
      currentDocWordsRead: currentDocWordsCount,
      currentDocDwellMs: currentDocDwellTotal,
      currentDocAvgWpm,
      wpmHistory,
      recentSessions: pastSessions,
      currentSessionSpeedTrend,
      currentSessionWordsRead,
      currentSessionDwellMs,
      currentSessionAvgWpm,
      currentSessionPeakWpm,
      isAutoPaused: Boolean(isAutoPaused),
      complexityBreakdown: {
        fastWords,
        steadyWords,
        complexWords,
        unreadWords,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastSessions, heatmapData, wpm, documentTitle, renderTick, isAutoPaused, warmupStatus]);

  // Compute actual reading run metrics (for completion screen actual WPM)
  const currentRunStats: ReadingRunStats = useMemo(() => {
    const run = trackerRef.current.run;
    const wordsRead = run.wordsSet.size;
    const activeMs = Math.round(run.activeMs);
    const actualWpm = calculateActualWpm(
      wordsRead,
      activeMs,
      statsSummary.currentDocAvgWpm || wpm
    );
    return {
      wordsRead,
      activeMs,
      actualWpm,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderTick, statsSummary.currentDocAvgWpm, wpm]);

  // Reset the active read-through run (e.g. on Restart / Read Again)
  const resetCurrentRun = useCallback(() => {
    resetReadingRun(trackerRef.current, currentIndexRef.current, performance.now());
    setRenderTick((t) => (t + 1) % 10000);
  }, []);

  // Reset heatmap data for current document
  const resetHeatmap = useCallback(() => {
    trackerRef.current.dwellTimes = new Array(Math.max(0, effectiveTotalWords)).fill(0);
    resetReadingRun(trackerRef.current, currentIndexRef.current, performance.now());
    try {
      safeStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setRenderTick((t) => (t + 1) % 10000);
  }, [storageKey, effectiveTotalWords]);

  // Reset all historical reading stats and sessions
  const clearAllStats = useCallback(() => {
    activeSessionRef.current = null;
    setPastSessions([]);
    try {
      safeStorage.removeItem(STORAGE_KEY_SESSIONS);
      safeStorage.removeItem(STORAGE_KEY_CURRENT_SPEED_TREND);
      safeStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    trackerRef.current.dwellTimes = new Array(Math.max(0, effectiveTotalWords)).fill(0);
    resetReadingRun(trackerRef.current, currentIndexRef.current, performance.now());
    setRenderTick((t) => (t + 1) % 10000);
  }, [storageKey, effectiveTotalWords]);

  return {
    heatmapData,
    dwellTimes: trackerRef.current.dwellTimes,
    statsSummary,
    currentRunStats,
    resetCurrentRun,
    resetHeatmap,
    clearAllStats,
  };
}

