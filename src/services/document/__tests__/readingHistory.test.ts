import test from 'node:test';
import assert from 'node:assert/strict';
import { SavedDocument } from '../../../types';
import {
  buildHistoryExcerpt,
  createDeferredDeleteController,
  createUniqueDocumentId,
  formatHistoryToastTitle,
  restoreHistoryDocument,
  upsertHistoryDocument,
} from '../readingHistory';

function makeDoc(overrides: Partial<SavedDocument> & { id: string; title: string }): SavedDocument {
  return {
    wordCount: 100,
    lastReadIndex: 0,
    lastReadDate: '2026-11-21T10:00:00.000Z',
    sourceType: 'text',
    ...overrides,
  };
}

test('same-titled captures with different IDs are both preserved and never overwrite each other', () => {
  const capture1 = makeDoc({
    id: createUniqueDocumentId('doc'),
    title: 'Web Selection',
    wordCount: 142,
    lastReadDate: '2026-11-21T10:00:00.000Z',
    excerpt: 'First captured paragraph about focus...',
  });
  const capture2 = makeDoc({
    id: createUniqueDocumentId('doc'),
    title: 'Web Selection',
    wordCount: 285,
    lastReadDate: '2026-11-21T10:05:00.000Z',
    excerpt: 'Second captured paragraph about memory...',
  });
  const capture3 = makeDoc({
    id: createUniqueDocumentId('doc'),
    title: 'Web Selection',
    wordCount: 64,
    lastReadDate: '2026-11-21T10:10:00.000Z',
    excerpt: 'Third captured paragraph about sleep...',
  });

  let history: SavedDocument[] = [];
  history = upsertHistoryDocument(history, capture1);
  history = upsertHistoryDocument(history, capture2);
  history = upsertHistoryDocument(history, capture3);

  assert.equal(history.length, 3);
  assert.deepEqual(
    history.map((d) => d.id),
    [capture3.id, capture2.id, capture1.id]
  );
  assert.deepEqual(
    history.map((d) => d.wordCount),
    [64, 285, 142]
  );
});

test('reopening an existing document by ID deduplicates, promotes to top, and preserves metadata', () => {
  const docA = makeDoc({
    id: 'doc-a',
    title: 'Article Title',
    wordCount: 300,
    sourceUrl: 'https://example.com/a',
    excerpt: 'Original excerpt A',
    lastReadDate: '2026-11-21T09:00:00.000Z',
  });
  const docB = makeDoc({
    id: 'doc-b',
    title: 'Article Title',
    wordCount: 500,
    sourceUrl: 'https://example.com/b',
    excerpt: 'Original excerpt B',
    lastReadDate: '2026-11-21T09:30:00.000Z',
  });

  let history = upsertHistoryDocument([], docA);
  history = upsertHistoryDocument(history, docB);
  assert.deepEqual(
    history.map((d) => d.id),
    ['doc-b', 'doc-a']
  );

  // Reopen doc-a (same ID, omitting sourceUrl and excerpt)
  history = upsertHistoryDocument(
    history,
    makeDoc({
      id: 'doc-a',
      title: 'Article Title',
      wordCount: 300,
      lastReadDate: '2026-11-21T10:00:00.000Z',
    })
  );

  assert.equal(history.length, 2);
  assert.deepEqual(
    history.map((d) => d.id),
    ['doc-a', 'doc-b']
  );
  assert.equal(history[0].sourceUrl, 'https://example.com/a');
  assert.equal(history[0].excerpt, 'Original excerpt A');
  assert.equal(history[0].lastReadDate, '2026-11-21T10:00:00.000Z');
});

test('createUniqueDocumentId generates unique IDs even within the same millisecond', () => {
  const ids = new Set<string>();
  for (let i = 0; i < 50; i++) {
    ids.add(createUniqueDocumentId('doc'));
  }
  assert.equal(ids.size, 50);
});

test('buildHistoryExcerpt produces clean compact single-line previews', () => {
  assert.equal(
    buildHistoryExcerpt('# Heading\n\nThis is **bold**   text with `code`.\n'),
    'Heading This is bold text with code.'
  );
  const longText = 'word '.repeat(40);
  const excerpt = buildHistoryExcerpt(longText, 40);
  assert.ok(excerpt.length <= 40);
  assert.ok(excerpt.endsWith('…'));
});

test('restoreHistoryDocument re-inserts at original index, clamps bounds, and deduplicates', () => {
  const docA = makeDoc({ id: 'doc-a', title: 'Alpha' });
  const docB = makeDoc({ id: 'doc-b', title: 'Beta' });
  const docC = makeDoc({ id: 'doc-c', title: 'Gamma' });

  const restoredMiddle = restoreHistoryDocument([docA, docC], docB, 1);
  assert.deepEqual(
    restoredMiddle.map((d) => d.id),
    ['doc-a', 'doc-b', 'doc-c']
  );

  const restoredClamped = restoreHistoryDocument([docA], docC, 99);
  assert.deepEqual(
    restoredClamped.map((d) => d.id),
    ['doc-a', 'doc-c']
  );

  const restoredDeduped = restoreHistoryDocument([docA, docB, docC], docB, 0);
  assert.deepEqual(
    restoredDeduped.map((d) => d.id),
    ['doc-b', 'doc-a', 'doc-c']
  );
});

test('formatHistoryToastTitle truncates long titles and falls back for blank titles', () => {
  assert.equal(formatHistoryToastTitle('   '), 'Untitled');
  assert.equal(formatHistoryToastTitle('Short Title', 36), 'Short Title');
  const truncated = formatHistoryToastTitle('A Very Long Research Paper Title About Focus And Reading', 24);
  assert.ok(truncated.length <= 24);
  assert.ok(truncated.endsWith('…'));
});

test('createDeferredDeleteController defers commit until timer expires and cancels cleanly on undo', () => {
  const committed: string[] = [];
  const timers = new Map<number, () => void>();
  let nextTimerId = 1;

  const controller = createDeferredDeleteController({
    delayMs: 6000,
    onCommit: (id) => committed.push(id),
    setTimer: (cb) => {
      const id = nextTimerId++;
      timers.set(id, cb);
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (handle) => {
      timers.delete(handle as unknown as number);
    },
  });

  const docA = makeDoc({ id: 'doc-a', title: 'Alpha' });
  controller.schedule({ doc: docA, originalIndex: 1 });

  // Not deleted from IndexedDB immediately
  assert.deepEqual(committed, []);
  assert.equal(controller.getPending()?.doc.id, 'doc-a');
  assert.equal(timers.size, 1);

  // Undo cancels timer and prevents commit
  const restored = controller.undo('doc-a');
  assert.equal(restored?.doc.id, 'doc-a');
  assert.equal(restored?.originalIndex, 1);
  assert.equal(controller.getPending(), null);
  assert.equal(timers.size, 0);
  assert.deepEqual(committed, []);

  // Re-schedule and let timer expire -> commits to IndexedDB
  controller.schedule({ doc: docA, originalIndex: 1 });
  const [[, fireTimeout]] = Array.from(timers.entries());
  fireTimeout();
  assert.deepEqual(committed, ['doc-a']);
  assert.equal(controller.getPending(), null);
});

test('createDeferredDeleteController commits earlier delete when another delete is scheduled and on flush', () => {
  const committed: string[] = [];
  const timers = new Map<number, () => void>();
  let nextTimerId = 1;

  const controller = createDeferredDeleteController({
    delayMs: 6000,
    onCommit: (id) => committed.push(id),
    setTimer: (cb) => {
      const id = nextTimerId++;
      timers.set(id, cb);
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: (handle) => {
      timers.delete(handle as unknown as number);
    },
  });

  const docA = makeDoc({ id: 'doc-a', title: 'Alpha' });
  const docB = makeDoc({ id: 'doc-b', title: 'Beta' });

  controller.schedule({ doc: docA, originalIndex: 0 });
  assert.deepEqual(committed, []);

  // Deleting docB commits docA immediately while keeping docB undoable
  controller.schedule({ doc: docB, originalIndex: 0 });
  assert.deepEqual(committed, ['doc-a']);
  assert.equal(controller.getPending()?.doc.id, 'doc-b');
  assert.equal(timers.size, 1);

  // Undo with mismatched ID does nothing
  assert.equal(controller.undo('doc-a'), null);
  assert.equal(controller.getPending()?.doc.id, 'doc-b');

  // Flush commits pending docB exactly once
  controller.flush();
  controller.flush();
  assert.deepEqual(committed, ['doc-a', 'doc-b']);
  assert.equal(controller.getPending(), null);
  assert.equal(timers.size, 0);
});

