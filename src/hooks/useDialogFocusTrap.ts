import { useEffect, useRef, type RefObject } from 'react';

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Stack of currently open dialog elements so stacked dialogs (e.g., a modal
 * launched from inside a drawer) delegate Tab trapping and Escape closing
 * exclusively to the topmost dialog.
 */
const activeDialogStack: HTMLElement[] = [];

export function pushActiveDialog(el: HTMLElement): void {
  const existingIdx = activeDialogStack.indexOf(el);
  if (existingIdx !== -1) {
    activeDialogStack.splice(existingIdx, 1);
  }
  activeDialogStack.push(el);
}

export function removeActiveDialog(el: HTMLElement): void {
  const idx = activeDialogStack.indexOf(el);
  if (idx !== -1) {
    activeDialogStack.splice(idx, 1);
  }
}

export function isTopmostDialog(el: HTMLElement | null): boolean {
  if (!el || activeDialogStack.length === 0) return false;
  return activeDialogStack[activeDialogStack.length - 1] === el;
}

export function getActiveDialogStackSize(): number {
  return activeDialogStack.length;
}

/**
 * Returns visible, keyboard-focusable elements inside a dialog container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tabIndex < 0) return false;

    // Exclude elements hidden inside inert or aria-hidden subtrees within the dialog
    let parent: HTMLElement | null = el.parentElement;
    while (parent && parent !== container) {
      if (parent.hasAttribute('inert') || parent.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      parent = parent.parentElement;
    }

    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes which element should receive focus when Tab / Shift+Tab is pressed
 * inside a modal dialog. Returns null when native browser tab traversal stays
 * safely inside the dialog.
 */
export function computeNextTabTarget<T extends object>(
  focusables: readonly T[],
  activeElement: T | null,
  shiftKey: boolean,
  container: T,
  isInsideContainer: boolean
): T | null {
  if (focusables.length === 0) {
    return container;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (!isInsideContainer || !activeElement) {
    return shiftKey ? last : first;
  }

  if (shiftKey) {
    if (activeElement === first || activeElement === container) {
      return last;
    }
    return null;
  }

  if (activeElement === last) {
    return first;
  }

  return null;
}

/**
 * Resolves the element that should regain focus when a dialog closes.
 * Supports triggers that temporarily unmount while the dialog is open
 * (such as the collapsed sidebar toggle button) by falling back to their ID.
 */
export function resolveReturnFocusTarget(
  previousElement: HTMLElement | null,
  previousElementId: string | null,
  doc: Pick<Document, 'getElementById'> = document
): HTMLElement | null {
  if (previousElement && previousElement.isConnected && !previousElement.hasAttribute('disabled')) {
    return previousElement;
  }
  if (previousElementId) {
    const byId = doc.getElementById(previousElementId);
    if (byId && !byId.hasAttribute('disabled')) {
      return byId;
    }
  }
  return null;
}

export interface UseDialogFocusTrapOptions {
  isOpen: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

/**
 * Accessible modal/drawer hook that:
 * - Saves the previously focused element before moving focus into the dialog
 * - Traps Tab and Shift+Tab inside the topmost open dialog
 * - Keeps stray focus inside the dialog (while allowing interactive toast actions)
 * - Closes the topmost dialog on Escape without dismissing underlying drawers
 * - Restores focus to the triggering element on close or unmount
 */
export function useDialogFocusTrap({
  isOpen,
  containerRef,
  onClose,
  initialFocusRef,
  restoreFocus = true,
}: UseDialogFocusTrapOptions): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const activeEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFocusRef.current = activeEl && !container.contains(activeEl) ? activeEl : null;
    previousFocusIdRef.current =
      previousFocusRef.current && previousFocusRef.current.id
        ? previousFocusRef.current.id
        : null;

    pushActiveDialog(container);

    // Move focus into the dialog on the next frame so transitions/conditional mounts settle
    const focusFrame = window.requestAnimationFrame(() => {
      if (!isTopmostDialog(container)) return;
      if (container.contains(document.activeElement)) return;

      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred) && !preferred.hasAttribute('disabled')) {
        preferred.focus({ preventScroll: true });
        return;
      }

      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog(container)) return;

      if (event.key === 'Escape') {
        if (event.defaultPrevented) return;
        if (onCloseRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = getFocusableElements(container);
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isInside = Boolean(active && container.contains(active));
      const nextTarget = computeNextTabTarget(
        focusables,
        active,
        event.shiftKey,
        container,
        isInside
      );

      if (nextTarget) {
        event.preventDefault();
        nextTarget.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopmostDialog(container)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || container.contains(target)) return;

      // Allow interacting with floating Undo toasts rendered above open drawers
      if (target.closest('#app-toast-notification, [role="status"], [role="alert"]')) {
        return;
      }

      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      removeActiveDialog(container);

      if (!restoreFocus) return;

      const savedEl = previousFocusRef.current;
      const savedId = previousFocusIdRef.current;
      previousFocusRef.current = null;
      previousFocusIdRef.current = null;

      // Defer one frame so conditionally re-mounted triggers (like the collapsed sidebar button) exist
      window.requestAnimationFrame(() => {
        const target = resolveReturnFocusTarget(savedEl, savedId);
        if (target) {
          target.focus({ preventScroll: true });
        }
      });
    };
  }, [isOpen, containerRef, initialFocusRef, restoreFocus]);
}
