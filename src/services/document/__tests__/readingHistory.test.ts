import test from 'node:test';
import assert from 'node:assert/strict';
import { SavedDocument } from '../../../types';
import {
  buildHistoryExcerpt,
  createUniqueDocumentId,
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
