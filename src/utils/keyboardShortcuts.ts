export interface ShortcutKeyEventLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  targetTagName?: string;
  isContentEditable?: boolean;
}

export interface ShortcutContext {
  isAnyModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  canUndoRestart: boolean;
}

export type ShortcutAction =
  | { type: 'open_input_hub' }
  | { type: 'paste_clipboard' }
  | { type: 'undo_restart' }
  | { type: 'font_decrease' }
  | { type: 'font_increase' }
  | { type: 'toggle_play' }
  | { type: 'seek_relative'; delta: number }
  | { type: 'wpm_delta'; delta: number }
  | { type: 'restart' }
  | { type: 'toggle_fullscreen' }
  | { type: 'toggle_view_mode' }
  | { type: 'toggle_metronome' }
  | { type: 'toggle_narration' }
  | { type: 'toggle_timer_modal' }
  | { type: 'toggle_stats_modal' }
  | { type: 'toggle_sidebar_overview' }
  | { type: 'toggle_theme' }
  | { type: 'toggle_shortcuts' }
  | { type: 'close_modals' };

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Resolves a keyboard event into a reader shortcut action while enforcing:
 * - No interception when typing in form fields, contenteditable elements, or IME composition
 * - No single-key shortcut firing when Ctrl/Cmd/Alt browser modifiers are held
 * - No background reader single-key shortcuts while modals/drawers are open
 * - Destructive Restart requires Shift + R (plain R never restarts the document)
 * - Ctrl/Cmd + Z undoes a recent restart when an undo snapshot is available
 */
export function resolveKeyboardShortcut(
  e: ShortcutKeyEventLike,
  ctx: ShortcutContext
): ShortcutAction | null {
  if (e.isComposing) return null;

  const tag = (e.targetTagName || '').toUpperCase();
  if (EDITABLE_TAGS.has(tag) || e.isContentEditable) {
    return null;
  }

  // Always allow Escape to close modals/drawers
  if (e.code === 'Escape' || e.key === 'Escape') {
    return { type: 'close_modals' };
  }

  // Explicit Ctrl/Cmd modifier shortcuts (never with Alt)
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const lower = e.key.toLowerCase();
    if (lower === 'o' && !e.shiftKey) {
      return { type: 'open_input_hub' };
    }
    if (lower === 'v' && !e.shiftKey) {
      return { type: 'paste_clipboard' };
    }
    if (lower === 'z' && !e.shiftKey && ctx.canUndoRestart) {
      return { type: 'undo_restart' };
    }
    // Never let browser shortcuts (Ctrl/Cmd+R, Ctrl/Cmd+F, Ctrl/Cmd+S, Ctrl/Cmd+T, etc.)
    // fall through to single-key reader shortcuts.
    return null;
  }

  // Never intercept Alt-modified browser/OS navigation shortcuts (e.g., Alt+ArrowLeft)
  if (e.altKey) {
    return null;
  }

  // When a modal or drawer is open, block background reader shortcuts
  // (allow '?' / '/' only to close an already-open shortcuts dialog).
  if (ctx.isAnyModalOpen) {
    if (ctx.isShortcutsModalOpen && !e.repeat && (e.key === '?' || e.key === '/')) {
      return { type: 'toggle_shortcuts' };
    }
    return null;
  }

  // Font size adjustments (- / + / =)
  if (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
    return { type: 'font_decrease' };
  }
  if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || (e.shiftKey && e.code === 'Equal')) {
    return { type: 'font_increase' };
  }

  // Playback & navigation
  if (e.code === 'Space') {
    if (e.repeat) return null;
    return { type: 'toggle_play' };
  }
  if (e.code === 'ArrowLeft') {
    return { type: 'seek_relative', delta: e.shiftKey ? -1 : -10 };
  }
  if (e.code === 'ArrowRight') {
    return { type: 'seek_relative', delta: e.shiftKey ? 1 : 10 };
  }
  if (e.code === 'ArrowUp') {
    return { type: 'wpm_delta', delta: 25 };
  }
  if (e.code === 'ArrowDown') {
    return { type: 'wpm_delta', delta: -25 };
  }

  // Destructive Restart requires explicit Shift + R (plain R or CapsLock R will NOT restart)
  if (e.shiftKey && (e.code === 'KeyR' || e.key === 'R' || e.key === 'r')) {
    if (e.repeat) return null;
    return { type: 'restart' };
  }

  // Shortcuts help (? requires Shift on US keyboards, / does not)
  if (e.key === '?' || e.key === '/') {
    if (e.repeat) return null;
    return { type: 'toggle_shortcuts' };
  }

  // Non-destructive single-key toggles (require no Shift so Shift+letter doesn't misfire)
  if (e.shiftKey || e.repeat) {
    return null;
  }

  const lowerKey = e.key.toLowerCase();
  switch (lowerKey) {
    case 'f':
      return { type: 'toggle_fullscreen' };
    case 'm':
      return { type: 'toggle_view_mode' };
    case 's':
      return { type: 'toggle_metronome' };
    case 'v':
      return { type: 'toggle_narration' };
    case 't':
      return { type: 'toggle_timer_modal' };
    case 'a':
      return { type: 'toggle_stats_modal' };
    case 'o':
      return { type: 'toggle_sidebar_overview' };
    case 'd':
      return { type: 'toggle_theme' };
    default:
      return null;
  }
}

export function extractShortcutKeyEvent(e: KeyboardEvent): ShortcutKeyEventLike {
  const target = e.target as HTMLElement | null;
  const isContentEditable = Boolean(
    target &&
      (target.isContentEditable ||
        (typeof target.closest === 'function' && target.closest('[contenteditable="true"]')))
  );

  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    repeat: e.repeat,
    isComposing: e.isComposing,
    targetTagName: target?.tagName,
    isContentEditable,
  };
}
