import { useCallback, useEffect, useRef } from 'react';

export type AutoPauseReason = 'mouse' | 'blur' | 'visibility';
export type PlayIntentSource = 'click' | 'pointerdown' | 'keyboard';
export type PlayIntentResult = 'immediate' | 'queued';

export const DEFAULT_RESUME_GRACE_MS = 450;
export const DEFAULT_TRANSITION_SETTLE_MS = 250;
export const DEFAULT_QUEUED_RESUME_DEDUPE_MS = 350;
export const DEFAULT_MOUSE_EXIT_GRACE_MS = 600;

export interface SmartAutoPauseTimers {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export interface SmartAutoPauseControllerOptions {
  getIsPlaying: () => boolean;
  getEnabled: () => boolean;
  onAutoPause: (reason: AutoPauseReason) => void;
  onResumeQueued?: () => void;
  resumeGraceMs?: number;
  transitionSettleMs?: number;
  queuedResumeDedupeMs?: number;
  mouseExitGraceMs?: number;
  win?: any;
  doc?: any;
  docElem?: any;
  now?: () => number;
  timers?: SmartAutoPauseTimers;
}

export interface SmartAutoPauseHandle {
  /**
   * Expresses an explicit user intent to play/resume.
   * Returns 'immediate' if safe to resume synchronously, or 'queued' if a
   * transition state (active auto-pause settle, unfocused window, or hidden tab)
   * is detected and the intent has been queued to flush once settled.
   */
  requestPlay: (source?: PlayIntentSource) => PlayIntentResult;
  /**
   * Captures a resume intent on pointerdown ONLY when the window or auto-pause
   * is currently in a transition state (e.g., clicking back into an unfocused
   * iframe/window where the OS or layout shift may swallow the subsequent click).
   */
  queuePlayIfTransitioning: () => boolean;
  /**
   * Cancels any queued play intent (e.g., explicit pause, restart, or navigation).
   */
  cancelQueuedPlay: () => void;
  /**
   * Returns true once if playback was just resumed by a pointerdown-queued
   * intent from the same click gesture, preventing the trailing click event on
   * a toggle button from immediately pausing playback again.
   */
  consumeRecentQueuedResume: () => boolean;
  /**
   * Returns whether a focus/visibility/auto-pause transition is currently active.
   */
  isInTransition: () => boolean;
}

/**
 * Pure Smart Auto-Pause controller used by both the React hook and unit tests.
 *
 * Prevents dropped resume clicks after an auto-pause by:
 * 1. Deduplicating same-tick auto-pause bursts (mouseleave + mouseout, blur + visibilitychange)
 * 2. Requiring viewport-edge coordinates on mouseout so DOM unmounts under the cursor
 *    (like the Smart Auto-Paused banner disappearing) never falsely re-trigger auto-pause
 * 3. Detecting transition states (active auto-pause settle, blurred/unfocused window, hidden tab)
 *    and queuing the user's play intent until the transition settles
 * 4. Guarding freshly resumed playback with a short grace window against trailing jitter
 */
export function createSmartAutoPauseController(options: SmartAutoPauseControllerOptions) {
  const win = options.win ?? (typeof window !== 'undefined' ? window : null);
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : null);
  const docElem = options.docElem ?? doc?.documentElement ?? null;
  const now = options.now ?? (() => Date.now());
  const timers: SmartAutoPauseTimers = options.timers ?? {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };

  const resumeGraceMs = options.resumeGraceMs ?? DEFAULT_RESUME_GRACE_MS;
  const transitionSettleMs = options.transitionSettleMs ?? DEFAULT_TRANSITION_SETTLE_MS;
  const queuedResumeDedupeMs = options.queuedResumeDedupeMs ?? DEFAULT_QUEUED_RESUME_DEDUPE_MS;
  const mouseExitGraceMs = options.mouseExitGraceMs ?? DEFAULT_MOUSE_EXIT_GRACE_MS;

  let pendingPauseInCurrentTick = false;
  let isTransitioning = false;
  let isWindowBlurred = false;
  let lastResumeAt: number | null = null;
  let queuedPlayIntent = false;
  let queuedPlaySource: PlayIntentSource | null = null;
  let lastPointerDownQueuedFlushAt: number | null = null;

  let transitionTimer: ReturnType<typeof setTimeout> | null = null;
  let queuedFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let pauseTickTimer: ReturnType<typeof setTimeout> | null = null;
  let mouseExitTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTransitionTimer = () => {
    if (transitionTimer !== null) {
      timers.clearTimeout(transitionTimer);
      transitionTimer = null;
    }
  };

  const clearQueuedFlushTimer = () => {
    if (queuedFlushTimer !== null) {
      timers.clearTimeout(queuedFlushTimer);
      queuedFlushTimer = null;
    }
  };

  const clearPauseTickTimer = () => {
    if (pauseTickTimer !== null) {
      timers.clearTimeout(pauseTickTimer);
      pauseTickTimer = null;
    }
  };

  const clearMouseExitTimer = () => {
    if (mouseExitTimer !== null) {
      timers.clearTimeout(mouseExitTimer);
      mouseExitTimer = null;
    }
  };

  const isWithinResumeGrace = () => {
    return lastResumeAt !== null && now() - lastResumeAt < resumeGraceMs;
  };

  const isDocumentHidden = () => Boolean(doc?.hidden);

  const isWindowUnfocused = () => {
    if (isWindowBlurred) return true;
    if (doc && typeof doc.hasFocus === 'function') {
      return !doc.hasFocus();
    }
    return false;
  };

  const isInTransition = () => {
    return pendingPauseInCurrentTick || isTransitioning || isDocumentHidden() || isWindowUnfocused();
  };

  const flushQueuedPlay = () => {
    if (!queuedPlayIntent) return;
    if (isDocumentHidden()) return;

    const source = queuedPlaySource;
    queuedPlayIntent = false;
    queuedPlaySource = null;
    isTransitioning = false;
    pendingPauseInCurrentTick = false;
    clearTransitionTimer();
    clearQueuedFlushTimer();
    clearPauseTickTimer();
    clearMouseExitTimer();

    lastResumeAt = now();
    if (source === 'pointerdown') {
      lastPointerDownQueuedFlushAt = lastResumeAt;
    }
    options.onResumeQueued?.();
  };

  const triggerAutoPause = (reason: AutoPauseReason) => {
    if (!options.getIsPlaying() || !options.getEnabled()) return;
    if (pendingPauseInCurrentTick) return;

    // Protect freshly resumed playback against trailing mouseout/mouseleave/blur jitter.
    // Genuine tab hiding (visibilitychange -> document.hidden) still pauses immediately.
    if (reason !== 'visibility' && isWithinResumeGrace()) {
      return;
    }

    clearMouseExitTimer();
    pendingPauseInCurrentTick = true;
    isTransitioning = true;
    queuedPlayIntent = false;
    queuedPlaySource = null;
    lastPointerDownQueuedFlushAt = null;
    clearQueuedFlushTimer();

    clearPauseTickTimer();
    pauseTickTimer = timers.setTimeout(() => {
      pauseTickTimer = null;
      pendingPauseInCurrentTick = false;
    }, 0);

    clearTransitionTimer();
    transitionTimer = timers.setTimeout(() => {
      transitionTimer = null;
      isTransitioning = false;
      if (queuedPlayIntent && !isDocumentHidden()) {
        flushQueuedPlay();
      }
    }, transitionSettleMs);

    options.onAutoPause(reason);
  };

  const isPointOutsideViewport = (e: any) => {
    const hasCoords = typeof e?.clientX === 'number' && typeof e?.clientY === 'number';
    if (!hasCoords) return true;
    const width = typeof win?.innerWidth === 'number' ? win.innerWidth : Infinity;
    const height = typeof win?.innerHeight === 'number' ? win.innerHeight : Infinity;
    return e.clientY <= 0 || e.clientX <= 0 || e.clientX >= width || e.clientY >= height;
  };

  // Schedule a mouse-exit auto-pause after a short grace period so accidental
  // edge bumps or brief pointer excursions don't disrupt reading flow.
  const scheduleMouseExitPause = () => {
    if (!options.getIsPlaying() || !options.getEnabled()) return;
    if (pendingPauseInCurrentTick || isWithinResumeGrace()) return;

    if (mouseExitGraceMs <= 0) {
      triggerAutoPause('mouse');
      return;
    }

    // Already counting down (e.g. mouseleave followed immediately by mouseout)
    if (mouseExitTimer !== null) return;

    mouseExitTimer = timers.setTimeout(() => {
      mouseExitTimer = null;
      triggerAutoPause('mouse');
    }, mouseExitGraceMs);
  };

  // 1. Mouse leaving the document window
  const handleMouseLeave = (e: any) => {
    if (!options.getIsPlaying() || !options.getEnabled()) return;

    const isOutside = !e?.relatedTarget && isPointOutsideViewport(e);
    if (isOutside) {
      scheduleMouseExitPause();
    }
  };

  // Cross-browser mouseout verification (requires outside viewport when coordinates are present
  // so DOM unmounts under the cursor inside the viewport never falsely trigger auto-pause)
  const handleMouseOut = (e: any) => {
    if (!options.getIsPlaying() || !options.getEnabled()) return;
    if (!e?.relatedTarget && !e?.toElement && isPointOutsideViewport(e)) {
      scheduleMouseExitPause();
    }
  };

  // 2. Window blur (tab switch, window minimization, external app focus)
  const handleWindowBlur = () => {
    isWindowBlurred = true;
    if (!options.getIsPlaying() || !options.getEnabled()) return;
    triggerAutoPause('blur');
  };

  // Window focus restored: flush any queued play intent immediately
  const handleWindowFocus = () => {
    isWindowBlurred = false;
    if (queuedPlayIntent && !isDocumentHidden()) {
      flushQueuedPlay();
    }
  };

  // 3. Document visibility change (e.g. background tab)
  const handleVisibilityChange = () => {
    if (isDocumentHidden()) {
      if (!options.getIsPlaying() || !options.getEnabled()) return;
      triggerAutoPause('visibility');
      return;
    }

    if (queuedPlayIntent) {
      flushQueuedPlay();
    }
  };

  // Pointer re-entering the viewport cancels any pending mouse-exit grace countdown
  // and settles any mouse-based transition
  const handleMouseEnter = () => {
    clearMouseExitTimer();
    if (queuedPlayIntent && !isDocumentHidden()) {
      flushQueuedPlay();
    }
  };

  // Fallback cancellation for browsers/iframes where moving back inside the viewport
  // emits mousemove without re-firing documentElement mouseenter
  const handleMouseMove = (e: any) => {
    if (mouseExitTimer !== null && !isPointOutsideViewport(e)) {
      clearMouseExitTimer();
    }
  };

  const requestPlay = (source: PlayIntentSource = 'click'): PlayIntentResult => {
    clearMouseExitTimer();
    lastResumeAt = now();

    if (isInTransition()) {
      queuedPlayIntent = true;
      queuedPlaySource = source;

      // If the tab is visible, schedule a short settle flush so the intent never stalls
      // even if a browser doesn't emit a follow-up focus/mouseenter event.
      if (!isDocumentHidden()) {
        clearQueuedFlushTimer();
        const delayMs = isWindowUnfocused() ? 60 : 0;
        queuedFlushTimer = timers.setTimeout(() => {
          queuedFlushTimer = null;
          isWindowBlurred = false;
          flushQueuedPlay();
        }, delayMs);
      }
      return 'queued';
    }

    queuedPlayIntent = false;
    queuedPlaySource = null;
    isTransitioning = false;
    pendingPauseInCurrentTick = false;
    lastPointerDownQueuedFlushAt = null;
    clearTransitionTimer();
    clearQueuedFlushTimer();
    clearPauseTickTimer();
    return 'immediate';
  };

  const queuePlayIfTransitioning = (): boolean => {
    if (!isInTransition()) return false;
    requestPlay('pointerdown');
    return true;
  };

  const cancelQueuedPlay = () => {
    queuedPlayIntent = false;
    queuedPlaySource = null;
    lastPointerDownQueuedFlushAt = null;
    clearQueuedFlushTimer();
    clearMouseExitTimer();
  };

  const consumeRecentQueuedResume = (): boolean => {
    if (lastPointerDownQueuedFlushAt === null) return false;
    const withinDedupe = now() - lastPointerDownQueuedFlushAt <= queuedResumeDedupeMs;
    lastPointerDownQueuedFlushAt = null;
    return withinDedupe;
  };

  docElem?.addEventListener('mouseleave', handleMouseLeave);
  docElem?.addEventListener('mouseenter', handleMouseEnter);
  doc?.addEventListener('mousemove', handleMouseMove);
  win?.addEventListener('mouseout', handleMouseOut);
  win?.addEventListener('blur', handleWindowBlur);
  win?.addEventListener('focus', handleWindowFocus);
  doc?.addEventListener('visibilitychange', handleVisibilityChange);

  const cleanup = () => {
    clearTransitionTimer();
    clearQueuedFlushTimer();
    clearPauseTickTimer();
    clearMouseExitTimer();
    docElem?.removeEventListener('mouseleave', handleMouseLeave);
    docElem?.removeEventListener('mouseenter', handleMouseEnter);
    doc?.removeEventListener('mousemove', handleMouseMove);
    win?.removeEventListener('mouseout', handleMouseOut);
    win?.removeEventListener('blur', handleWindowBlur);
    win?.removeEventListener('focus', handleWindowFocus);
    doc?.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  return {
    requestPlay,
    queuePlayIfTransitioning,
    cancelQueuedPlay,
    consumeRecentQueuedResume,
    isInTransition,
    hasQueuedPlayIntent: () => queuedPlayIntent,
    hasPendingMouseExitPause: () => mouseExitTimer !== null,
    cleanup,
  };
}

interface UseSmartAutoPauseOptions {
  isPlaying: boolean;
  enabled: boolean;
  onAutoPause: (reason: AutoPauseReason) => void;
  onResumeQueued?: () => void;
  mouseExitGraceMs?: number;
}

/**
 * Smart Auto-Pause Hook
 * Monitors user presence and automatically pauses playback when:
 * 1. The cursor leaves the document/browser viewport
 * 2. The window or iframe loses focus (tab switch, alt-tab, application switch)
 * 3. The document becomes hidden (background tab)
 *
 * Returns imperative helpers so play/resume clicks during focus or auto-pause
 * transitions are queued and flushed reliably instead of being dropped.
 */
export function useSmartAutoPause({
  isPlaying,
  enabled,
  onAutoPause,
  onResumeQueued,
  mouseExitGraceMs,
}: UseSmartAutoPauseOptions): SmartAutoPauseHandle {
  const isPlayingRef = useRef(isPlaying);
  const enabledRef = useRef(enabled);
  const onAutoPauseRef = useRef(onAutoPause);
  const onResumeQueuedRef = useRef(onResumeQueued);
  const controllerRef = useRef<ReturnType<typeof createSmartAutoPauseController> | null>(null);

  // Keep refs synchronously current on render so same-tick events never see stale state
  isPlayingRef.current = isPlaying;
  enabledRef.current = enabled;
  onAutoPauseRef.current = onAutoPause;
  onResumeQueuedRef.current = onResumeQueued;

  useEffect(() => {
    if (!enabled) {
      controllerRef.current = null;
      return;
    }

    const controller = createSmartAutoPauseController({
      getIsPlaying: () => isPlayingRef.current,
      getEnabled: () => enabledRef.current,
      onAutoPause: (reason) => onAutoPauseRef.current(reason),
      onResumeQueued: () => onResumeQueuedRef.current?.(),
      mouseExitGraceMs,
    });

    controllerRef.current = controller;

    return () => {
      controller.cleanup();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [enabled, mouseExitGraceMs]);

  const requestPlay = useCallback((source: PlayIntentSource = 'click'): PlayIntentResult => {
    if (!controllerRef.current) return 'immediate';
    return controllerRef.current.requestPlay(source);
  }, []);

  const queuePlayIfTransitioning = useCallback((): boolean => {
    if (!controllerRef.current) return false;
    return controllerRef.current.queuePlayIfTransitioning();
  }, []);

  const cancelQueuedPlay = useCallback(() => {
    controllerRef.current?.cancelQueuedPlay();
  }, []);

  const consumeRecentQueuedResume = useCallback((): boolean => {
    if (!controllerRef.current) return false;
    return controllerRef.current.consumeRecentQueuedResume();
  }, []);

  const isInTransition = useCallback((): boolean => {
    if (!controllerRef.current) return false;
    return controllerRef.current.isInTransition();
  }, []);

  return {
    requestPlay,
    queuePlayIfTransitioning,
    cancelQueuedPlay,
    consumeRecentQueuedResume,
    isInTransition,
  };
}
