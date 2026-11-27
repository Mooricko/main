import { SavedDocument } from '../../types';

let fallbackIdCounter = 0;

/**
 * Generates a collision-resistant document ID even when multiple captures
 * occur within the same millisecond.
 */
export function createUniqueDocumentId(prefix = 'doc'): string {
  fallbackIdCounter = (fallbackIdCounter + 1) % 1_000_000;
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${fallbackIdCounter}-${randomPart}`;
}

/**
 * Creates a compact, single-line plain preview excerpt for distinguishing
 * same-titled captures in Reading History without storing full text.
 */
export function buildHistoryExcerpt(text: string, maxLength = 96): string {
  if (!text) return '';
  const collapsed = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}|>+)\s*/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * Upserts a document into Reading History, deduplicating strictly by document ID.
 *
 * Same-titled documents with different IDs (for example, multiple "Web Selection"
 * captures or repeated captures from the same webpage title) are ALWAYS preserved
 * as distinct history entries rather than overwriting one another.
 *
 * When reopening an existing document (same ID), its entry is updated and promoted
 * to the top of the list (most recently read first).
 */
export function upsertHistoryDocument(
  history: SavedDocument[],
  incoming: SavedDocument
): SavedDocument[] {
  const existing = history.find((item) => item.id === incoming.id);

  const merged: SavedDocument = existing
    ? {
        ...existing,
        ...incoming,
        category: incoming.category ?? existing.category,
        sourceUrl: incoming.sourceUrl ?? existing.sourceUrl,
        fileName: incoming.fileName ?? existing.fileName,
        excerpt: incoming.excerpt || existing.excerpt,
      }
    : incoming;

  const rest = history.filter((item) => item.id !== incoming.id);
  return [merged, ...rest];
}

export const HISTORY_DELETE_UNDO_MS = 6000;

export interface PendingHistoryDelete {
  doc: SavedDocument;
  originalIndex: number;
}

export interface DeferredDeleteControllerOptions {
  delayMs?: number;
  onCommit: (documentId: string) => void;
  setTimer?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface DeferredDeleteController {
  schedule: (entry: PendingHistoryDelete) => void;
  undo: (documentId?: string) => PendingHistoryDelete | null;
  flush: () => void;
  getPending: () => PendingHistoryDelete | null;
}

/**
 * Re-inserts a previously removed history document at its original index
 * without creating duplicates.
 */
export function restoreHistoryDocument(
  history: SavedDocument[],
  doc: SavedDocument,
  originalIndex: number
): SavedDocument[] {
  const withoutDoc = history.filter((item) => item.id !== doc.id);
  const clampedIndex = Math.max(0, Math.min(originalIndex, withoutDoc.length));
  return [
    ...withoutDoc.slice(0, clampedIndex),
    doc,
    ...withoutDoc.slice(clampedIndex),
  ];
}

/**
 * Formats a document title for compact display inside Undo toasts.
 */
export function formatHistoryToastTitle(title: string, maxLength = 36): string {
  const trimmed = (title || 'Untitled').trim() || 'Untitled';
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

/**
 * Coordinates deferred IndexedDB document deletion behind an Undo window.
 *
 * - Scheduling a delete starts a timer and does NOT invoke onCommit immediately.
 * - Calling undo() before expiry cancels the timer so IndexedDB is untouched.
 * - Scheduling a second delete while one is pending commits the earlier delete immediately.
 * - Calling flush() (e.g. on unload/unmount) immediately commits any pending delete once.
 */
export function createDeferredDeleteController(
  options: DeferredDeleteControllerOptions
): DeferredDeleteController {
  const delayMs = options.delayMs ?? HISTORY_DELETE_UNDO_MS;
  const setTimerFn = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
  const clearTimerFn = options.clearTimer ?? ((handle) => clearTimeout(handle));

  let pending: PendingHistoryDelete | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearPendingTimer = () => {
    if (timer !== null) {
      clearTimerFn(timer);
      timer = null;
    }
  };

  const commitPending = () => {
    if (!pending) return;
    clearPendingTimer();
    const docId = pending.doc.id;
    pending = null;
    options.onCommit(docId);
  };

  return {
    schedule(entry: PendingHistoryDelete) {
      if (pending) {
        if (pending.doc.id === entry.doc.id) {
          clearPendingTimer();
        } else {
          commitPending();
        }
      }

      pending = entry;
      const scheduledId = entry.doc.id;
      timer = setTimerFn(() => {
        if (!pending || pending.doc.id !== scheduledId) return;
        timer = null;
        pending = null;
        options.onCommit(scheduledId);
      }, delayMs);
    },

    undo(documentId?: string): PendingHistoryDelete | null {
      if (!pending) return null;
      if (documentId !== undefined && pending.doc.id !== documentId) {
        return null;
      }
      clearPendingTimer();
      const restored = pending;
      pending = null;
      return restored;
    },

    flush() {
      commitPending();
    },

    getPending() {
      return pending;
    },
  };
}

