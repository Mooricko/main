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
