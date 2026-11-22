import { isRtlText, countWordsFast } from './textParser';
import { measureDevTiming } from './performanceDiagnostics';

/**
 * Normalizes input text into clean, readable prose:
 * - Standardizes line breaks (\r\n -> \n)
 * - Performs Unicode NFC normalization
 * - Collapses excessive horizontal whitespace and tabs
 * - Limits consecutive line breaks to max 2 (\n\n for paragraph separation)
 * - Removes non-printable control characters while preserving ZWNJ (\u200C) and ZWJ (\u200D)
 * - Preserves Persian/Arabic/Hebrew RTL and Unicode scripts faithfully
 */
export function normalizeText(rawText: string): string {
  if (!rawText) return '';

  return measureDevTiming(
    'text normalization',
    () => {
      // 1. Unicode NFC normalization
      let text = rawText.normalize('NFC');

      // 2. Normalize Windows and old Mac line breaks to standard Unix \n
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // 3. Replace non-breaking spaces and zero-width spaces that aren't ZWNJ/ZWJ
      text = text.replace(/\u00A0/g, ' ');
      text = text.replace(/[\u200B\uFEFF]/g, ''); // Remove zero-width spaces and BOM, keeping \u200C (ZWNJ) and \u200D (ZWJ)

      // 4. Strip dangerous non-printable ASCII control characters (keeping \t and \n)
      text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // 5. Clean up horizontal spaces: collapse tabs/multiple spaces and trim line edges
      // Uses fast regex replacement instead of allocating thousands of line substring arrays
      text = text.replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '');

      // 6. Collapse excessive blank lines (cap at 2 newlines = 1 blank line between paragraphs)
      text = text.replace(/\n{3,}/g, '\n\n');

      return text.trim();
    },
    (result) => ({
      charCount: result.length,
      wordCount: countWordsFast(result),
      paragraphCount: result.split(/\n\n+/).length,
    })
  );
}

/**
 * Derives a clean, readable title from text content if none was supplied.
 * Scans only the first few non-empty lines to avoid allocating a full lines array.
 */
export function extractSuggestedTitle(content: string, fallback = 'Imported Reading'): string {
  if (!content || !content.trim()) return fallback;

  // Scan first 1000 characters without splitting entire document into lines
  const head = content.slice(0, 1000);
  const lines = head.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^#+\s*/, '').replace(/^[*\-•\d.]+\s*/, '').trim();
    if (trimmed.length > 2) {
      if (trimmed.length <= 65) {
        return trimmed;
      }
      return trimmed.slice(0, 62).trim() + '...';
    }
  }

  return fallback;
}

/**
 * Detects text language direction ('rtl' or 'ltr').
 * Calculates RTL vs Latin/LTR script dominance so mixed documents and Markdown
 * syntax characters don't distort the true reading orientation.
 */
export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  if (!text) return 'ltr';

  const sample = text.length > 5000 ? text.slice(0, 5000) : text;
  let rtlCount = 0;
  let ltrCount = 0;

  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    // Arabic, Persian, Hebrew Unicode blocks
    if (
      (code >= 0x0590 && code <= 0x05ff) ||
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff) ||
      (code >= 0xfb1d && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      rtlCount++;
    } else if (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 0x00c0 && code <= 0x024f)
    ) {
      ltrCount++;
    }
  }

  if (rtlCount > 0 && rtlCount >= ltrCount) {
    return 'rtl';
  }
  if (rtlCount > 0 && ltrCount === 0) {
    return 'rtl';
  }
  return 'ltr';
}

/**
 * Counts words accurately across Latin and non-Latin/RTL scripts with zero array allocations.
 */
export function countWords(text: string): number {
  return countWordsFast(text);
}

