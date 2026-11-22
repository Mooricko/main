import { DocumentMetadata, DocumentStructure, InputSourceType, SavedDocument } from '../../types';
import { SAMPLE_TEXTS } from '../../data/sampleTexts';
import { countWordsFast } from '../../utils/textParser';

export interface OverviewStatsInput {
  documentId: string;
  metadata?: DocumentMetadata | null;
  structure?: DocumentStructure | null;
  savedDocuments?: SavedDocument[];
  fallbackTotalWords?: number;
  currentTitle?: string;
}

export interface ResolvedOverviewStats {
  totalWords: number;
  pageCount: number;
  totalCharacters: number;
  sourceType: InputSourceType;
  displayTitle: string;
}

/**
 * Resolves reliable Overview statistics for the active document.
 *
 * Uses IndexedDB metadata when available for the active document ID, and falls
 * back gracefully to the active reader's parsed word count, built-in sample
 * content, or saved library metadata so the Overview never renders "0 words"
 * during initial storage hydration or fallback reads.
 */
export function resolveOverviewStats({
  documentId,
  metadata,
  structure,
  savedDocuments = [],
  fallbackTotalWords,
  currentTitle,
}: OverviewStatsInput): ResolvedOverviewStats {
  const matchingMeta = metadata && (!documentId || metadata.id === documentId) ? metadata : null;
  const matchingSaved = savedDocuments.find((doc) => doc.id === documentId) ?? null;
  const matchingSample = SAMPLE_TEXTS.find((sample) => sample.id === documentId) ?? null;

  const sampleActualWords = matchingSample?.text ? countWordsFast(matchingSample.text) : 0;

  let totalWords = 0;
  if (matchingMeta && matchingMeta.totalWords > 0) {
    totalWords = matchingMeta.totalWords;
  } else if (typeof fallbackTotalWords === 'number' && fallbackTotalWords > 0) {
    totalWords = fallbackTotalWords;
  } else if (sampleActualWords > 0) {
    totalWords = sampleActualWords;
  } else if (matchingSaved && matchingSaved.wordCount > 0) {
    totalWords = matchingSaved.wordCount;
  }

  const pageCount =
    matchingMeta?.pageCount ||
    structure?.pages?.length ||
    matchingSaved?.pageCount ||
    0;

  const totalCharacters =
    matchingMeta?.totalCharacters ||
    matchingSaved?.totalCharacters ||
    (matchingSample?.text ? matchingSample.text.length : 0);

  const sourceType: InputSourceType =
    matchingMeta?.sourceType ||
    matchingSaved?.sourceType ||
    matchingSample?.sourceType ||
    'text';

  const displayTitle =
    matchingMeta?.title ||
    currentTitle ||
    matchingSaved?.title ||
    matchingSample?.title ||
    'Document Overview';

  return {
    totalWords,
    pageCount,
    totalCharacters,
    sourceType,
    displayTitle,
  };
}
