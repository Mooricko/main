/**
 * eSpeak NG WebAssembly Farsi Phonemizer
 * 
 * Performs true G2P (Grapheme-to-Phoneme) translation for Persian text
 * using eSpeak NG WASM with voice "fa".
 * 
 * Provides:
 * - Separation of G2P from audio synthesis (produces IPA strings without audio generation)
 * - 100% offline local execution (no cloud APIs, no network calls)
 * - Deterministic IPA output compatible with Piper fa_IR-amir-medium model
 */

import { initialize, setVoice, getPhonemes } from 'espeak-phonemizer';
import { FarsiPhonemizer, PiperTokenizeOptions } from './types';
import { normalizePersianText } from './persianNormalizer';
import { phonemesToPiperTokens } from './piperTokenizer';

class EspeakFarsiPhonemizer implements FarsiPhonemizer {
  public readonly voice = 'fa';

  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
        
        if (isNode) {
          // Node.js environment automatically resolves to installed package directory
          await initialize();
        } else {
          // Browser or Chrome Extension environment
          const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL;
          const base = isExtension
            ? chrome.runtime.getURL('espeak-data')
            : '/espeak-data';

          try {
            await initialize(base);
          } catch (initErr) {
            // Fallback: try relative path if root /espeak-data failed
            console.warn('Initial espeak data path failed, trying relative ./espeak-data:', initErr);
            await initialize('./espeak-data');
          }
        }

        await setVoice(this.voice);
        this.isInitialized = true;
        console.log('✓ eSpeak NG Farsi Phonemizer initialized successfully (voice: fa)');
        return true;
      } catch (err) {
        console.error('Failed to initialize eSpeak NG Farsi phonemizer:', err);
        this.isInitialized = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Convert normalized Persian text into an eSpeak IPA phoneme string.
   */
  public async phonemize(text: string): Promise<string> {
    const normalized = normalizePersianText(text);
    if (!normalized) return '';

    const ready = await this.init();
    if (!ready) {
      throw new Error('eSpeak NG Farsi Phonemizer is not initialized');
    }

    try {
      const clauses = getPhonemes(normalized);
      if (!clauses || clauses.length === 0) {
        return '';
      }

      // Concatenate clause phonemes with clause terminators
      const phonemeParts = clauses.map((c) => {
        // eSpeak inserts language-switch flags such as "(en)" / "(fa)" around foreign words.
        // They are not phonemes: leaving them in makes Piper pronounce the letters "e", "n", "f", "a".
        const p = (c.phonemes || '').replace(/\([a-z]{2,3}(?:-[a-z0-9]+)?\)/gi, '').replace(/\s+/g, ' ').trim();
        const term = (c.terminator || '').trim();
        return term ? `${p}${term}` : p;
      });

      return phonemeParts.filter(Boolean).join(' ').trim();
    } catch (err: any) {
      console.error('eSpeak NG phonemization error for Persian text:', err);
      throw err;
    }
  }

  /**
   * Convert Persian text directly into Piper token IDs using model's phoneme_id_map.
   */
  public async phonemizeToTokens(
    text: string,
    phonemeIdMap?: Record<string, number | number[]>,
    options?: PiperTokenizeOptions
  ): Promise<number[]> {
    if (!text) return [];
    if (!phonemeIdMap) {
      throw new Error('phonemizeToTokens requires a valid model phoneme_id_map');
    }

    const phonemes = await this.phonemize(text);
    return phonemesToPiperTokens(phonemes, phonemeIdMap, options);
  }
}

export const farsiPhonemizer = new EspeakFarsiPhonemizer();
