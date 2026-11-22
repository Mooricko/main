import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_TEXTS } from '../../../data/sampleTexts';
import { countWordsFast } from '../../../utils/textParser';
import { resolveOverviewStats } from '../overviewStats';
import { ensureSampleDocumentInStorage } from '../migration';
import { documentStorageService } from '../documentStorageService';
import { formatSourceAwareSummary } from '../../structure/documentSizeClassifier';
import { DocumentMetadata } from '../../../types';

test('default sample document never shows 0 words in Overview when metadata is not yet hydrated', () => {
  const defaultSample = SAMPLE_TEXTS[0];
  const expectedWordCount = countWordsFast(defaultSample.text || '');
  assert.ok(expectedWordCount > 0, 'Default sample must have positive word count');

  // Case 1: Metadata is null and fallbackTotalWords is absent (earliest render / storage miss)
  const fromSample = resolveOverviewStats({
    documentId: defaultSample.id,
    metadata: null,
    structure: null,
    savedDocuments: [],
    currentTitle: defaultSample.title,
  });

  assert.strictEqual(fromSample.totalWords, expectedWordCount);
  assert.strictEqual(fromSample.displayTitle, defaultSample.title);
  assert.ok(fromSample.totalCharacters > 0);
  assert.strictEqual(
    formatSourceAwareSummary({
      sourceType: fromSample.sourceType,
      wordCount: fromSample.totalWords,
      pageCount: fromSample.pageCount,
    }),
    `${expectedWordCount.toLocaleString()} words`
  );

  // Case 2: Active reader already parsed fallback words before IndexedDB resolves
  const fromReaderFallback = resolveOverviewStats({
    documentId: defaultSample.id,
    metadata: null,
    structure: null,
    fallbackTotalWords: expectedWordCount,
    currentTitle: defaultSample.title,
  });

  assert.strictEqual(fromReaderFallback.totalWords, expectedWordCount);
});

test('resolveOverviewStats prefers matching IndexedDB metadata and ignores stale metadata from another document', () => {
  const defaultSample = SAMPLE_TEXTS[0];
  const expectedSampleWords = countWordsFast(defaultSample.text || '');

  const staleOtherMeta: DocumentMetadata = {
    id: 'other-doc-id',
    title: 'Other Doc',
    sourceType: 'pdf',
    totalWords: 9999,
    totalCharacters: 50000,
    totalChunks: 10,
    pageCount: 25,
    direction: 'ltr',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastReadWordIndex: 0,
  };

  // Should ignore staleOtherMeta since its id does not match documentId
  const ignoredStale = resolveOverviewStats({
    documentId: defaultSample.id,
    metadata: staleOtherMeta,
    structure: null,
    currentTitle: defaultSample.title,
  });

  assert.strictEqual(ignoredStale.totalWords, expectedSampleWords);
  assert.strictEqual(ignoredStale.sourceType, 'text');
  assert.strictEqual(ignoredStale.displayTitle, defaultSample.title);

  const matchingMeta: DocumentMetadata = {
    id: 'custom-doc-1',
    title: 'Uploaded Article',
    sourceType: 'markdown',
    totalWords: 432,
    totalCharacters: 2600,
    totalChunks: 1,
    direction: 'ltr',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastReadWordIndex: 10,
  };

  const resolved = resolveOverviewStats({
    documentId: 'custom-doc-1',
    metadata: matchingMeta,
    structure: null,
    fallbackTotalWords: 120,
    currentTitle: 'Stale Title',
  });

  assert.strictEqual(resolved.totalWords, 432);
  assert.strictEqual(resolved.sourceType, 'markdown');
  assert.strictEqual(resolved.displayTitle, 'Uploaded Article');
});

test('ensureSampleDocumentInStorage seeds default sample even when storage already contains other documents', async () => {
  await documentStorageService.clearAll();

  // Seed an unrelated user document first so dbDocCount > 0
  await documentStorageService.createAndSaveDocument({
    id: 'user-doc-only',
    title: 'User Note',
    text: 'This is a custom document already in IndexedDB.',
    sourceType: 'text',
  });

  const defaultSample = SAMPLE_TEXTS[0];
  const expectedWords = countWordsFast(defaultSample.text || '');

  assert.strictEqual(
    await documentStorageService.getMetadata(defaultSample.id),
    null,
    'Default sample should initially be absent'
  );

  const seededMeta = await ensureSampleDocumentInStorage(defaultSample.id);
  assert.ok(seededMeta, 'ensureSampleDocumentInStorage should return seeded metadata');
  assert.strictEqual(seededMeta.id, defaultSample.id);
  assert.strictEqual(seededMeta.totalWords, expectedWords);

  const persistedMeta = await documentStorageService.getMetadata(defaultSample.id);
  assert.ok(persistedMeta);
  assert.strictEqual(persistedMeta.totalWords, expectedWords);

  const persistedStruct = await documentStorageService.getStructure(defaultSample.id);
  assert.ok(persistedStruct, 'Seeded sample should have built document structure');

  await documentStorageService.clearAll();
});
