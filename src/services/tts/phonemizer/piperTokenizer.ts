/**
 * Piper Tokenizer
 * 
 * Maps eSpeak IPA phonemes into numerical token sequences according to the
 * Piper model's `phoneme_id_map`.
 * 
 * Features:
 * 1. Authoritative mapping using the model's metadata (`phoneme_id_map`).
 * 2. Proper BOS (1: '^') and EOS (2: '$') boundary tokens.
 * 3. VITS PAD (0: '_') interspersing.
 * 4. Stress markers (ˈ, ˌ, ː, ˑ) and punctuation preservation.
 * 5. Robust normalization of phoneme variants (e.g. ɡ <-> g, punctuation substitutions).
 * 6. Explicit handling of unknown phonemes: controlled warnings without corrupting the sequence
 *    or silently mapping unknown phonemes to space.
 */

import { PiperTokenizeOptions } from './types';

// Fallback mappings for character variants that may appear in eSpeak output
const PHONEME_VARIANT_MAP: Record<string, string> = {
  // Punctuation variants
  '،': ',',
  '؛': ';',
  '؟': '?',
  '۔': '.',
  '«': '"',
  '»': '"',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '—': '-',
  '–': '-',

  // Phonetic symbol variants
  'g': 'ɡ', // ASCII g to IPA script ɡ
};

/**
 * Resolves a single symbol to a token ID from the model's phoneme_id_map
 */
export function getSymbolTokenId(
  phonemeIdMap: Record<string, number | number[]>,
  symbol: string
): number | undefined {
  const entry = phonemeIdMap[symbol];
  if (typeof entry === 'number') return entry;
  if (Array.isArray(entry) && entry.length > 0) return entry[0];

  // Try variant fallback
  const variant = PHONEME_VARIANT_MAP[symbol];
  if (variant && phonemeIdMap[variant] !== undefined) {
    const varEntry = phonemeIdMap[variant];
    if (typeof varEntry === 'number') return varEntry;
    if (Array.isArray(varEntry) && varEntry.length > 0) return varEntry[0];
  }

  return undefined;
}

/**
 * Converts an eSpeak IPA phoneme string into a Piper token ID sequence.
 */
export function phonemesToPiperTokens(
  phonemeString: string,
  phonemeIdMap: Record<string, number | number[]>,
  options: PiperTokenizeOptions = {}
): number[] {
  if (!phonemeString || !phonemeIdMap) {
    return [];
  }

  const bosToken = options.bosToken ?? getSymbolTokenId(phonemeIdMap, '^') ?? 1;
  const eosToken = options.eosToken ?? getSymbolTokenId(phonemeIdMap, '$') ?? 2;
  const padToken = options.padToken ?? getSymbolTokenId(phonemeIdMap, '_') ?? 0;
  const interspersePad = options.interspersePad ?? true;

  const validTokenIds: number[] = [];

  for (let i = 0; i < phonemeString.length; i++) {
    const char = phonemeString[i];

    // Ignore zero-width characters in phoneme stream
    if (char === '\u200C' || char === '\u200B' || char === '\uFEFF') {
      continue;
    }

    const id = getSymbolTokenId(phonemeIdMap, char);

    if (id !== undefined) {
      validTokenIds.push(id);
    } else {
      // Explicit warning for unknown phonemes (NEVER silently replace with space)
      options.onUnknownPhoneme?.(char);
      console.warn(
        `[PiperTokenizer] Unknown phoneme symbol "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase()}) omitted`
      );
    }
  }

  // Assemble token sequence with BOS, EOS, and optional interspersing PAD
  const result: number[] = [bosToken];

  for (const id of validTokenIds) {
    if (interspersePad) {
      result.push(padToken);
    }
    result.push(id);
  }

  if (interspersePad) {
    result.push(padToken);
  }

  result.push(eosToken);

  return result;
}
