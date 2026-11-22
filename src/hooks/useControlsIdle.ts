import { useEffect, useState } from 'react';

export const DEFAULT_CONTROLS_IDLE_TIMEOUT_MS = 5000;

export const CONTROLS_ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
] as const;

export interface ControlsIdleStateInput {
  isPlaying: boolean;
  isAnyModalOpen: boolean;
}

/**
 * Controls should only auto-hide during active reading playback when no modal
 * or drawer is open. While reading is paused, controls must remain visible.
 */
export function shouldAutoHideControls({
  isPlaying,
  isAnyModalOpen,
}: ControlsIdleStateInput): boolean {
  return isPlaying && !isAnyModalOpen;
}

export interface ControlsIdleTimerApi {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export interface ControlsIdleEventTarget {
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: EventListenerOptions | boolean
  ) => void;
}

export interface ControlsIdleControllerOptions {
  idleTimeoutMs?: number;
  onIdleChange: (isIdle: boolean) => void;
  target?: ControlsIdleEventTarget | null;
  timers?: ControlsIdleTimerApi;
}

/**
 * Pure controller managing auto-hide idle state for reader controls.
 * Separated for deterministic unit testing and used directly by useControlsIdle.
 */
export function createControlsIdleController({
  idleTimeoutMs = DEFAULT_CONTROLS_IDLE_TIMEOUT_MS,
  onIdleChange,
  target = typeof window !== 'undefined' ? window : null,
  timers = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  },
}: ControlsIdleControllerOptions) {
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let isIdle = false;
  let autoHideEnabled = false;
  let attached = false;

  const setIdleState = (next: boolean) => {
    if (isIdle !== next) {
      isIdle = next;
      onIdleChange(next);
    }
  };

  const clearTimer = () => {
    if (idleTimer !== null) {
      timers.clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const scheduleTimer = () => {
    clearTimer();
    if (!autoHideEnabled) return;
    idleTimer = timers.setTimeout(() => {
      idleTimer = null;
      if (autoHideEnabled) {
        setIdleState(true);
      }
    }, idleTimeoutMs);
  };

  const handleActivity = () => {
    setIdleState(false);
    scheduleTimer();
  };

  const detachListeners = () => {
    if (!attached || !target) return;
    for (const eventName of CONTROLS_ACTIVITY_EVENTS) {
      target.removeEventListener(eventName, handleActivity);
    }
    attached = false;
  };

  const attachListeners = () => {
    if (attached || !target) return;
    for (const eventName of CONTROLS_ACTIVITY_EVENTS) {
      target.addEventListener(eventName, handleActivity, { passive: true });
    }
    attached = true;
  };

  const update = (state: ControlsIdleStateInput) => {
    const nextEnabled = shouldAutoHideControls(state);
    autoHideEnabled = nextEnabled;

    if (!nextEnabled) {
      clearTimer();
      detachListeners();
      setIdleState(false);
      return;
    }

    attachListeners();
    setIdleState(false);
    scheduleTimer();
  };

  const dispose = () => {
    autoHideEnabled = false;
    clearTimer();
    detachListeners();
  };

  return {
    update,
    dispose,
    recordActivity: handleActivity,
    getIsIdle: () => isIdle,
  };
}

export interface UseControlsIdleOptions extends ControlsIdleStateInput {
  idleTimeoutMs?: number;
}

/**
 * Tracks whether reader controls should fade out after inactivity.
 * Only activates while reading is playing and no modal/drawer is open.
 */
export function useControlsIdle({
  isPlaying,
  isAnyModalOpen,
  idleTimeoutMs = DEFAULT_CONTROLS_IDLE_TIMEOUT_MS,
}: UseControlsIdleOptions): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if (!shouldAutoHideControls({ isPlaying, isAnyModalOpen })) {
      setIsIdle(false);
      return;
    }

    setIsIdle(false);
    const controller = createControlsIdleController({
      idleTimeoutMs,
      onIdleChange: setIsIdle,
    });

    controller.update({ isPlaying, isAnyModalOpen });

    return () => {
      controller.dispose();
    };
  }, [isPlaying, isAnyModalOpen, idleTimeoutMs]);

  return isPlaying && !isAnyModalOpen ? isIdle : false;
}
