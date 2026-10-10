/**
 * Offscreen TTS Bridge & Extension Entry Point
 * 
 * Exposes the canonical TTS engines and manager to the Chrome Extension
 * offscreen document execution context without duplicating any algorithms.
 */

import { farsiOfflineTts } from './farsiOfflineTTS';
import { piperEngine, PiperEngine } from './piperEngine';
import { espeakEngine, EspeakEngine } from './espeakEngine';
import { farsiPhonemizer } from './phonemizer/espeakPhonemizer';
import { encodePcmWav, encodePcmWavBuffer, validateWavBuffer, playAudioBlob } from './audioUtils';
import { normalizePersianText } from './phonemizer/persianNormalizer';
import { phonemesToPiperTokens } from './phonemizer/piperTokenizer';
import { indexedDbModelStore, PIPER_CACHE_VERSION } from './indexedDbModelStore';

if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  g.farsiOfflineTts = farsiOfflineTts;
  g.piperEngine = piperEngine;
  g.espeakEngine = espeakEngine;
  g.PiperEngine = PiperEngine;
  g.EspeakEngine = EspeakEngine;
  g.farsiPhonemizer = farsiPhonemizer;
  g.encodePcmWav = encodePcmWav;
  g.encodePcmWavBuffer = encodePcmWavBuffer;
  g.validateWavBuffer = validateWavBuffer;
  g.playAudioBlob = playAudioBlob;
  g.normalizePersianText = normalizePersianText;
  g.phonemesToPiperTokens = phonemesToPiperTokens;
  g.indexedDbModelStore = indexedDbModelStore;
  g.PIPER_CACHE_VERSION = PIPER_CACHE_VERSION;
}

export {
  farsiOfflineTts,
  piperEngine,
  espeakEngine,
  PiperEngine,
  EspeakEngine,
  farsiPhonemizer,
  encodePcmWav,
  normalizePersianText,
  phonemesToPiperTokens,
  indexedDbModelStore,
  PIPER_CACHE_VERSION,
};
