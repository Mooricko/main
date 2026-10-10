/**
 * Farsi Phonemizer, Normalizer & Tokenizer for Piper TTS
 * 
 * High-level facade for Persian NLP pipeline:
 * Persian text -> Persian normalization -> eSpeak NG G2P (voice: fa) -> IPA phonemes -> Piper token IDs
 */

import { normalizePersianText } from './phonemizer/persianNormalizer';
import { farsiPhonemizer } from './phonemizer/espeakPhonemizer';
import { phonemesToPiperTokens, getSymbolTokenId } from './phonemizer/piperTokenizer';

// Re-export normalizer functions
export { normalizePersianText };
export const normalizeFarsiText = normalizePersianText;

// Re-export phonemizer and tokenizer
export { farsiPhonemizer };
export { phonemesToPiperTokens, getSymbolTokenId };
export type { FarsiPhonemizer, PiperTokenizeOptions, PhonemizerClause } from './phonemizer/types';

/**
 * Converts Farsi text into Piper token IDs via eSpeak NG G2P phonemization.
 * Operates authoritatively from model metadata (phoneme_id_map).
 */
export async function farsiTextToPiperTokens(
  text: string,
  phonemeIdMap?: Record<string, number | number[]>
): Promise<number[]> {
  return farsiPhonemizer.phonemizeToTokens(text, phonemeIdMap);
}

// Re-export WAV encoder utilities for single-source-of-truth
export { encodePcmWav, encodePcmWavBuffer } from './audioUtils';
export { FARSI_PHONEME_TABLE } from './espeakEngine';
export type { PhonemeFormants } from './espeakEngine';
