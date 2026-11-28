/**
 * Offscreen TTS Bridge & Extension Entry Point
 *
 * Exposes the canonical TTS engines and manager to the Chrome Extension
 * offscreen document execution context without duplicating any algorithms.
 */

import { farsiOfflineTts } from './farsiOfflineTTS';
import { piperEngine, PiperEngine } from './piperEngine';
import { tinyAvaEngine, TinyAvaEngine } from './tinyAvaEngine';
import { espeakEngine, EspeakEngine } from './espeakEngine';
import { customTtsEngine, CustomTtsEngine } from './customTtsEngine';
import { farsiPhonemizer } from './phonemizer/espeakPhonemizer';
import { encodePcmWav, encodePcmWavBuffer, validateWavBuffer, playAudioBlob } from './audioUtils';
import { normalizePersianText, splitIntoSentences } from './phonemizer/persianNormalizer';
import { normalizePersianForTinyAva } from './tinyAvaFrontend';
import { phonemesToPiperTokens } from './phonemizer/piperTokenizer';
import { indexedDbModelStore, PIPER_CACHE_VERSION } from './indexedDbModelStore';
import { tinyAvaModelStore, TINY_AVA_CACHE_VERSION } from './tinyAvaModelStore';
import {
  TINY_AVA_CACHE_NAME,
  TINY_AVA_CORE_ASSETS,
  TINY_AVA_MULTIVOICE_ASSETS,
  getTinyAvaAssetManifest,
  fetchAndCacheTinyAvaAsset,
  ensureTinyAvaModelsCached,
  getCachedTinyAvaAsset,
  isTinyAvaCacheReady,
  clearTinyAvaModelCache,
} from './tinyAvaModelCache';
import { isFarsiTtsEngine, isTinyAvaVoice } from './types';

if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  g.farsiOfflineTts = farsiOfflineTts;
  g.piperEngine = piperEngine;
  g.tinyAvaEngine = tinyAvaEngine;
  g.espeakEngine = espeakEngine;
  g.customTtsEngine = customTtsEngine;
  g.PiperEngine = PiperEngine;
  g.TinyAvaEngine = TinyAvaEngine;
  g.EspeakEngine = EspeakEngine;
  g.CustomTtsEngine = CustomTtsEngine;
  g.farsiPhonemizer = farsiPhonemizer;
  g.encodePcmWav = encodePcmWav;
  g.encodePcmWavBuffer = encodePcmWavBuffer;
  g.validateWavBuffer = validateWavBuffer;
  g.playAudioBlob = playAudioBlob;
  g.normalizePersianText = normalizePersianText;
  g.normalizePersianForTinyAva = normalizePersianForTinyAva;
  g.splitIntoSentences = splitIntoSentences;
  g.phonemesToPiperTokens = phonemesToPiperTokens;
  g.indexedDbModelStore = indexedDbModelStore;
  g.PIPER_CACHE_VERSION = PIPER_CACHE_VERSION;
  g.tinyAvaModelStore = tinyAvaModelStore;
  g.TINY_AVA_CACHE_VERSION = TINY_AVA_CACHE_VERSION;
  g.TINY_AVA_CACHE_NAME = TINY_AVA_CACHE_NAME;
  g.TINY_AVA_CORE_ASSETS = TINY_AVA_CORE_ASSETS;
  g.TINY_AVA_MULTIVOICE_ASSETS = TINY_AVA_MULTIVOICE_ASSETS;
  g.getTinyAvaAssetManifest = getTinyAvaAssetManifest;
  g.fetchAndCacheTinyAvaAsset = fetchAndCacheTinyAvaAsset;
  g.ensureTinyAvaModelsCached = ensureTinyAvaModelsCached;
  g.getCachedTinyAvaAsset = getCachedTinyAvaAsset;
  g.isTinyAvaCacheReady = isTinyAvaCacheReady;
  g.clearTinyAvaModelCache = clearTinyAvaModelCache;
  g.isFarsiTtsEngine = isFarsiTtsEngine;
  g.isTinyAvaVoice = isTinyAvaVoice;
}

export {
  farsiOfflineTts,
  piperEngine,
  tinyAvaEngine,
  espeakEngine,
  customTtsEngine,
  PiperEngine,
  TinyAvaEngine,
  EspeakEngine,
  CustomTtsEngine,
  farsiPhonemizer,
  encodePcmWav,
  normalizePersianText,
  normalizePersianForTinyAva,
  splitIntoSentences,
  phonemesToPiperTokens,
  indexedDbModelStore,
  PIPER_CACHE_VERSION,
  tinyAvaModelStore,
  TINY_AVA_CACHE_VERSION,
  TINY_AVA_CACHE_NAME,
  TINY_AVA_CORE_ASSETS,
  TINY_AVA_MULTIVOICE_ASSETS,
  getTinyAvaAssetManifest,
  fetchAndCacheTinyAvaAsset,
  ensureTinyAvaModelsCached,
  getCachedTinyAvaAsset,
  isTinyAvaCacheReady,
  clearTinyAvaModelCache,
  isFarsiTtsEngine,
  isTinyAvaVoice,
};
