/**
 * Unified Dual-Engine Offline Farsi Text-To-Speech Manager
 * 
 * Orchestrates:
 * - Engine 1: eSpeak NG (WASM) - fast, robotic, <5MB footprint
 * - Engine 2: Piper Neural (ONNX Runtime Web) - high-quality, human-like voice
 * 
 * Provides:
 * - Automatic fallback if Piper is not cached or fails
 * - Clean audio interruption on new sentence
 * - Seamless communication with Manifest V3 Background Service Worker & Offscreen Document
 * - Full standalone in-browser support with IndexedDB caching
 */

import {
  FarsiTtsEngineType,
  FarsiTtsOptions,
  SynthesisResult,
  PiperCacheInfo,
  TinyAvaCacheInfo,
  TinyAvaVoiceId,
  FarsiTtsStatusNotice,
  isFarsiTtsEngine,
  isTinyAvaVoice,
  CustomTtsConfig,
  TtsLifecycleState,
} from './types';
import { espeakEngine } from './espeakEngine';
import { piperEngine } from './piperEngine';
import { tinyAvaEngine } from './tinyAvaEngine';
import { customTtsEngine } from './customTtsEngine';
import { indexedDbModelStore } from './indexedDbModelStore';
import { tinyAvaModelStore, TINY_AVA_CACHE_VERSION, TINY_AVA_MODEL_ID } from './tinyAvaModelStore';
import {
  ensureTinyAvaModelsCached,
  getTinyAvaCacheSummary,
  clearTinyAvaModelCache,
} from './tinyAvaModelCache';
import { safeStorage } from '../../utils/safeStorage';
import { loadCustomTtsConfig } from './customTtsConfig';
import { isRtlText } from '../../utils/textParser';

const STORAGE_KEY_ENGINE = 'adhd_reader_farsi_tts_engine';
const STORAGE_KEY_TINY_AVA_VOICE = 'adhd_reader_tiny_ava_voice';
const STORAGE_KEY_SPEED = 'adhd_reader_farsi_tts_speed';
const STORAGE_KEY_PITCH = 'adhd_reader_farsi_tts_pitch';

export const SAMPLE_FARSI_TEXT = 'این یک آزمایش برای سیستم تبدیل متن به گفتار آفلاین فارسی است.';

class FarsiOfflineTtsManager {
  private activeEngine: FarsiTtsEngineType = 'espeak';
  private hasExplicitUserEngineChoice: boolean = false;
  private tinyAvaVoice: TinyAvaVoiceId = 'parisa';
  private currentPlayingId: number = 0;
  private isSpeakingActive: boolean = false;
  private lifecycleState: TtsLifecycleState = 'IDLE';
  private hasNotifiedStartForCurrent: boolean = false;
  private hasNotifiedEndForCurrent: boolean = false;
  private activeCallbacks: FarsiTtsOptions | null = null;
  private listeners: Set<() => void> = new Set();
  private statusNoticeSeq: number = 0;
  private lastStatusNotice: FarsiTtsStatusNotice | null = null;
  private statusNoticeListeners: Set<(notice: FarsiTtsStatusNotice | null) => void> = new Set();

  constructor() {
    this.loadSavedSettings();
    this.setupExtensionMessageListener();
    if (typeof window !== 'undefined') {
      void this.autoPromoteCachedTinyAva();
    }
  }

  public getLifecycleState(): TtsLifecycleState {
    if (this.isSpeaking()) {
      return this.lifecycleState === 'IDLE' ? 'PLAYING' : this.lifecycleState;
    }
    return 'IDLE';
  }

  public resetForTesting(): void {
    this.stop();
    this.currentPlayingId = 0;
    this.isSpeakingActive = false;
    this.lifecycleState = 'IDLE';
    this.hasNotifiedStartForCurrent = false;
    this.hasNotifiedEndForCurrent = false;
    this.activeCallbacks = null;
    if (typeof (espeakEngine as any).resetForTesting === 'function') {
      (espeakEngine as any).resetForTesting();
    }
    if (typeof (piperEngine as any).resetForTesting === 'function') {
      (piperEngine as any).resetForTesting();
    }
    if (typeof (tinyAvaEngine as any).resetForTesting === 'function') {
      (tinyAvaEngine as any).resetForTesting();
    }
    this.tinyAvaVoice = 'parisa';
    this.activeEngine = 'espeak';
    this.hasExplicitUserEngineChoice = false;
    this.lastStatusNotice = null;
    this.statusNoticeListeners.clear();
  }

  public emitStatusNotice(
    notice: Omit<FarsiTtsStatusNotice, 'id' | 'timestamp'>
  ): FarsiTtsStatusNotice {
    const entry: FarsiTtsStatusNotice = {
      ...notice,
      id: ++this.statusNoticeSeq,
      timestamp: Date.now(),
    };
    this.lastStatusNotice = entry;
    this.statusNoticeListeners.forEach((cb) => {
      try {
        cb(entry);
      } catch {}
    });
    return entry;
  }

  public clearStatusNotice(): void {
    this.lastStatusNotice = null;
    this.statusNoticeListeners.forEach((cb) => {
      try {
        cb(null);
      } catch {}
    });
  }

  public getLastStatusNotice(): FarsiTtsStatusNotice | null {
    return this.lastStatusNotice;
  }

  public subscribeStatusNotice(
    cb: (notice: FarsiTtsStatusNotice | null) => void
  ): () => void {
    this.statusNoticeListeners.add(cb);
    if (this.lastStatusNotice) {
      try {
        cb(this.lastStatusNotice);
      } catch {}
    }
    return () => {
      this.statusNoticeListeners.delete(cb);
    };
  }

  public handleStopMessage(): void {
    this.stop();
  }

  private setupExtensionMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      try {
        chrome.runtime.onMessage.addListener((message: any) => {
          const action = message.action || message.type;
          if (action === 'STATUS_CHANGED') {
            this.handleExtensionStatusChanged(message);
          } else if (action === 'DOWNLOAD_PROGRESS' && message.engine === 'tiny-ava') {
            tinyAvaModelStore.reportExternalDownloadProgress({
              file: message.file || 'tiny-ava',
              totalLoadedBytes: message.totalLoadedBytes || 0,
              totalExpectedBytes: message.totalExpectedBytes || 0,
              percent: message.percent || 0,
              cached: Boolean(message.cached),
            });
            this.activeCallbacks?.onDownloadProgress?.({
              file: message.file || 'tiny-ava',
              fileLoadedBytes: message.fileLoadedBytes || 0,
              fileTotalBytes: message.fileTotalBytes || 0,
              totalLoadedBytes: message.totalLoadedBytes || 0,
              totalExpectedBytes: message.totalExpectedBytes || 0,
              percent: message.percent || 0,
              cached: Boolean(message.cached),
            });
          }
        });
      } catch {}
    }
  }

  /**
   * Dispatches lifecycle transitions from offscreen audio document
   */
  public handleExtensionStatusChanged(msg: any): void {
    const { state, playbackId, error } = msg;

    // Ignore events belonging to stale or cancelled utterances
    if (playbackId !== undefined && playbackId !== this.currentPlayingId) {
      return;
    }

    if (state === 'STARTED' || state === 'PLAYING') {
      this.isSpeakingActive = true;
      this.lifecycleState = 'PLAYING';
      if (!this.hasNotifiedStartForCurrent) {
        this.hasNotifiedStartForCurrent = true;
        this.activeCallbacks?.onStart?.({ durationMs: msg.durationMs });
      }
      this.notify();
    } else if (state === 'ENDED') {
      this.isSpeakingActive = false;
      this.lifecycleState = 'IDLE';
      const cb = this.activeCallbacks;
      this.activeCallbacks = null;
      if (!this.hasNotifiedEndForCurrent) {
        this.hasNotifiedEndForCurrent = true;
        cb?.onEnd?.();
      }
      this.notify();
    } else if (state === 'STOPPED') {
      this.isSpeakingActive = false;
      this.lifecycleState = 'IDLE';
      this.hasNotifiedEndForCurrent = true;
      this.activeCallbacks = null;
      this.notify();
    } else if (state === 'ERROR') {
      this.isSpeakingActive = false;
      this.lifecycleState = 'IDLE';
      this.hasNotifiedEndForCurrent = true;
      const cb = this.activeCallbacks;
      this.activeCallbacks = null;
      cb?.onError?.(new Error(error || 'Extension audio playback failed'));
      this.notify();
    }
  }

  private loadSavedSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedEngine = safeStorage.getItem(STORAGE_KEY_ENGINE) as FarsiTtsEngineType | null;
      if (savedEngine && isFarsiTtsEngine(savedEngine)) {
        this.activeEngine = savedEngine;
        this.hasExplicitUserEngineChoice = true;
      }

      const savedVoice = safeStorage.getItem(STORAGE_KEY_TINY_AVA_VOICE);
      if (savedVoice && isTinyAvaVoice(savedVoice)) {
        this.tinyAvaVoice = savedVoice;
        tinyAvaEngine.setDefaultVoice(savedVoice);
      }

      // Check if Chrome Extension storage has a preference
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['farsiTtsEngine', 'tinyAvaVoice'], (res) => {
          let changed = false;
          if (res?.farsiTtsEngine && isFarsiTtsEngine(res.farsiTtsEngine)) {
            this.activeEngine = res.farsiTtsEngine;
            this.hasExplicitUserEngineChoice = true;
            changed = true;
          }
          if (res?.tinyAvaVoice && isTinyAvaVoice(res.tinyAvaVoice)) {
            this.tinyAvaVoice = res.tinyAvaVoice;
            tinyAvaEngine.setDefaultVoice(res.tinyAvaVoice);
            changed = true;
          }
          if (changed) this.notify();
        });
      }
    } catch {
      // fallback
    }
  }

  /**
   * Promotes tiny-ava to be the default Farsi engine once its models are cached,
   * provided the user has not explicitly pinned another Farsi engine.
   */
  public async autoPromoteCachedTinyAva(cacheStorage?: CacheStorage): Promise<boolean> {
    if (this.hasExplicitUserEngineChoice) {
      return false;
    }
    try {
      const summary = await getTinyAvaCacheSummary(cacheStorage);
      if (summary.isParisaReady || summary.isMultiVoiceReady) {
        if (!this.hasExplicitUserEngineChoice && this.activeEngine !== 'tiny-ava') {
          this.activeEngine = 'tiny-ava';
          this.notify();
        }
        return true;
      }
      const idbInfo = await tinyAvaModelStore.checkCache();
      if (idbInfo.isOfflineReady) {
        if (!this.hasExplicitUserEngineChoice && this.activeEngine !== 'tiny-ava') {
          this.activeEngine = 'tiny-ava';
          this.notify();
        }
        return true;
      }
    } catch {
      // keep default engine
    }
    return false;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  public getActiveEngine(): FarsiTtsEngineType {
    return this.activeEngine;
  }

  public getTinyAvaVoice(): TinyAvaVoiceId {
    return this.tinyAvaVoice;
  }

  public setTinyAvaVoice(voice: TinyAvaVoiceId): void {
    if (!isTinyAvaVoice(voice)) return;
    this.tinyAvaVoice = voice;
    tinyAvaEngine.setDefaultVoice(voice);
    safeStorage.setItem(STORAGE_KEY_TINY_AVA_VOICE, voice);

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ tinyAvaVoice: voice }).catch(() => {});
    }
    this.notify();
  }

  public setEngine(engine: FarsiTtsEngineType): void {
    this.activeEngine = engine;
    this.hasExplicitUserEngineChoice = true;
    safeStorage.setItem(STORAGE_KEY_ENGINE, engine);

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ farsiTtsEngine: engine }).catch(() => {});
    }

    // Forward to extension background / offscreen if available
    this.sendExtensionMessage({ action: 'SET_ENGINE', engine });
    this.notify();
  }

  /**
   * Helper to check if running inside a Manifest V3 Chrome Extension context
   */
  public isExtensionContext(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.runtime &&
      !!chrome.runtime.id &&
      typeof chrome.runtime.sendMessage === 'function'
    );
  }

  /**
   * True when executing inside the offscreen document itself. In that context the manager is driven
   * directly by offscreen.js, so it must NOT send runtime messages (which would loop back into it).
   */
  public isOffscreenDocumentContext(): boolean {
    if (typeof (globalThis as any).__IS_OFFSCREEN_DOCUMENT__ !== 'undefined') {
      return Boolean((globalThis as any).__IS_OFFSCREEN_DOCUMENT__);
    }
    try {
      return typeof window !== 'undefined' && typeof window.location !== 'undefined' && /offscreen\.html(\?|#|$)/.test(window.location.href);
    } catch {
      return false;
    }
  }

  public isOffscreenContext(): boolean {
    return this.isOffscreenDocumentContext();
  }

  private sendExtensionMessage(payload: any): Promise<any> {
    if (!this.isExtensionContext() || this.isOffscreenContext()) {
      return Promise.resolve({ success: false, reason: 'not_extension' });
    }
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: true });
          }
        });
      } catch (e: any) {
        resolve({ success: false, error: e?.message });
      }
    });
  }

  /**
   * Synthesize text into audio buffer / WAV Blob.
   * Fallback is explicit and managed by FarsiOfflineTtsManager (neither engine secretly invokes the other).
   */
  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const engineType = options.engine || this.activeEngine;

    if (engineType === 'piper') {
      const piperResult = await piperEngine.synthesize(text, options);
      if (piperResult.success) {
        return piperResult;
      }

      // Caller explicitly disabled fallback
      if (options.allowFallback === false) {
        return piperResult;
      }

      // Explicit, honest fallback performed by the MANAGER
      const reason = piperResult.error || 'Piper neural model not ready in IndexedDB';
      console.warn(`[FarsiOfflineTtsManager] Piper failed (${reason}). Explicitly falling back to eSpeak NG WASM.`);
      options.onFallback?.(reason);

      const fallbackResult = await espeakEngine.synthesize(text, options);
      if (!fallbackResult.success) {
        return {
          ...fallbackResult,
          engineUsed: 'espeak',
          fallbackTriggered: true,
          fallbackReason: reason,
          error: `Both Piper and eSpeak fallback failed: (Piper: ${reason}) (eSpeak: ${fallbackResult.error || 'unknown'})`,
        };
      }
      return {
        ...fallbackResult,
        engineUsed: 'espeak',
        fallbackTriggered: true,
        fallbackReason: reason,
      };
    } else if (engineType === 'tiny-ava') {
      const tinyAvaOptions: FarsiTtsOptions = {
        ...options,
        voice: options.voice || this.tinyAvaVoice,
      };
      const tinyAvaResult = await tinyAvaEngine.synthesize(text, tinyAvaOptions);
      if (tinyAvaResult.success) {
        return tinyAvaResult;
      }

      if (options.allowFallback === false) {
        return tinyAvaResult;
      }

      const reason = tinyAvaResult.error || 'tiny-ava neural model not ready';

      // Graceful fallback chain: try Piper Neural first if ready/cached, then eSpeak NG
      let piperReady = piperEngine.isModelReady();
      if (!piperReady) {
        try {
          const piperCache = await indexedDbModelStore.checkCache();
          piperReady = piperCache.isOfflineReady;
        } catch {
          piperReady = false;
        }
      }

      if (piperReady) {
        console.warn(`[FarsiOfflineTtsManager] tiny-ava failed (${reason}). Falling back to Piper Neural.`);
        const piperFallback = await piperEngine.synthesize(text, {
          ...options,
          engine: 'piper',
          allowFallback: false,
        });
        if (piperFallback.success) {
          const noticeMsg = `tiny-ava unavailable (${reason}) — switched to Piper Neural fallback.`;
          this.emitStatusNotice({
            severity: 'warning',
            message: noticeMsg,
            requestedEngine: 'tiny-ava',
            fallbackEngine: 'piper',
            reason,
          });
          options.onFallback?.(noticeMsg);
          return {
            ...piperFallback,
            engineUsed: 'piper',
            fallbackTriggered: true,
            fallbackReason: noticeMsg,
          };
        }
      }

      console.warn(`[FarsiOfflineTtsManager] tiny-ava failed (${reason}). Explicitly falling back to eSpeak NG WASM.`);
      const espeakNoticeMsg = `tiny-ava unavailable (${reason}) — switched to eSpeak NG fallback.`;
      this.emitStatusNotice({
        severity: 'warning',
        message: espeakNoticeMsg,
        requestedEngine: 'tiny-ava',
        fallbackEngine: 'espeak',
        reason,
      });
      options.onFallback?.(espeakNoticeMsg);

      const fallbackResult = await espeakEngine.synthesize(text, options);
      if (!fallbackResult.success) {
        return {
          ...fallbackResult,
          engineUsed: 'espeak',
          fallbackTriggered: true,
          fallbackReason: espeakNoticeMsg,
          error: `Both tiny-ava and eSpeak fallback failed: (tiny-ava: ${reason}) (eSpeak: ${fallbackResult.error || 'unknown'})`,
        };
      }
      return {
        ...fallbackResult,
        engineUsed: 'espeak',
        fallbackTriggered: true,
        fallbackReason: espeakNoticeMsg,
      };
    } else if (engineType === 'custom') {
      // User's own endpoint. Fall back to eSpeak only if text is Farsi and fallback is permitted.
      const customResult = await customTtsEngine.synthesize(text, options);
      if (customResult.success) {
        return customResult;
      }
      const isFarsi = isRtlText(text);
      if (options.allowFallback === false || !isFarsi) {
        return customResult;
      }
      const reason = customResult.error || 'Custom TTS endpoint failed';
      console.warn(`[FarsiOfflineTtsManager] Custom TTS failed (${reason}). Falling back to eSpeak NG WASM.`);
      options.onFallback?.(reason);
      const fallbackResult = await espeakEngine.synthesize(text, options);
      if (!fallbackResult.success) {
        return {
          ...fallbackResult,
          engineUsed: 'espeak',
          fallbackTriggered: true,
          fallbackReason: reason,
          error: `Both Custom and eSpeak fallback failed: (Custom: ${reason}) (eSpeak: ${fallbackResult.error || 'unknown'})`,
        };
      }
      return {
        ...fallbackResult,
        engineUsed: 'espeak',
        fallbackTriggered: true,
        fallbackReason: reason,
      };
    } else {
      return espeakEngine.synthesize(text, options);
    }
  }

  /**
   * Play speech.
   * Cancels any active audio immediately before starting the new utterance.
   */
  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    // 1. Immediately cancel active speech
    this.stop();

    const playbackId = ++this.currentPlayingId;
    this.isSpeakingActive = true;
    this.lifecycleState = 'PLAYING';
    this.activeCallbacks = options;
    this.notify();

    const engineType = options.engine || this.activeEngine;

    // 2. If running inside Chrome Extension with offscreen support, delegate via message
    if (this.isExtensionContext()) {
      try {
        const payload: any = {
          action: 'SPEAK',
          type: 'SPEAK',
          text,
          engine: engineType,
          voice: options.voice || this.tinyAvaVoice,
          speed: options.speed ?? 1.0,
          pitch: options.pitch ?? 1.0,
          volume: options.volume ?? 1.0,
          allowFallback: options.allowFallback ?? true,
          playbackId,
        };
        // The offscreen document cannot read chrome.storage, so hand it the custom config.
        if (engineType === 'custom') {
          payload.customConfig = (await loadCustomTtsConfig()) ?? null;
        }
        const res = await this.sendExtensionMessage(payload);

        if (res && res.success) {
          // onStart is delivered by the STATUS_CHANGED (STARTED/PLAYING) event, not here,
          // to avoid firing twice and to carry the synthesized duration.
          if (res.fallbackTriggered && res.fallbackReason) {
            this.emitStatusNotice({
              severity: 'warning',
              message: res.fallbackReason,
              requestedEngine: engineType,
              fallbackEngine: res.engineUsed,
              reason: res.fallbackReason,
            });
            options.onFallback?.(res.fallbackReason);
          }
          return;
        } else if (res && !res.success) {
          this.isSpeakingActive = false;
          this.activeCallbacks = null;
          this.notify();
          options.onError?.(new Error(res.error || 'Extension offscreen speech synthesis failed'));
          return;
        }
      } catch (extErr) {
        console.debug('Extension offscreen message failed, falling back to local synthesizer:', extErr);
      }
    }

    // 3. In-browser direct speech playback via manager synthesis
    const wrappedOptions: FarsiTtsOptions = {
      ...options,
      onStart: (info) => {
        if (this.currentPlayingId === playbackId) {
          options.onStart?.(info);
        }
      },
      onEnd: () => {
        if (this.currentPlayingId === playbackId) {
          this.isSpeakingActive = false;
          this.lifecycleState = 'IDLE';
          this.activeCallbacks = null;
          this.notify();
          options.onEnd?.();
        }
      },
      onError: (err) => {
        if (this.currentPlayingId === playbackId) {
          this.isSpeakingActive = false;
          this.lifecycleState = 'IDLE';
          this.activeCallbacks = null;
          this.notify();
          options.onError?.(err);
        }
      },
      onFallback: (reason) => {
        options.onFallback?.(reason);
      },
    };

    try {
      const synthResult = await this.synthesize(text, options);

      // A stop() or a newer speak() superseded this utterance while synthesis was running.
      if (this.currentPlayingId !== playbackId) {
        return;
      }

      if (!synthResult.success || !synthResult.wavBlob) {
        this.isSpeakingActive = false;
        this.lifecycleState = 'IDLE';
        this.activeCallbacks = null;
        this.notify();
        options.onError?.(new Error(synthResult.error || 'Speech synthesis failed'));
        return;
      }

      if (synthResult.fallbackTriggered && synthResult.fallbackReason) {
        options.onFallback?.(synthResult.fallbackReason);
      }

      const activeEngineInstance =
        synthResult.engineUsed === 'piper'
          ? piperEngine
          : synthResult.engineUsed === 'tiny-ava'
            ? tinyAvaEngine
            : synthResult.engineUsed === 'custom'
              ? customTtsEngine
              : espeakEngine;
      await activeEngineInstance.playWavBlob(synthResult.wavBlob, wrappedOptions);
    } catch (err: any) {
      if (this.currentPlayingId === playbackId) {
        this.isSpeakingActive = false;
        this.lifecycleState = 'IDLE';
        this.activeCallbacks = null;
        this.notify();
        options.onError?.(err);
      }
    }
  }

  public stopLocal(): void {
    this.currentPlayingId++;
    this.isSpeakingActive = false;
    this.lifecycleState = 'IDLE';
    this.activeCallbacks = null;

    // Stop local engines
    espeakEngine.stop();
    piperEngine.stop();
    tinyAvaEngine.stop();
    customTtsEngine.stop();

    this.notify();
  }

  /**
   * Immediately stops any active audio playback
   */
  public stop(): void {
    this.stopLocal();

    // Stop extension offscreen audio (only if not offscreen context itself)
    if (this.isExtensionContext() && !this.isOffscreenDocumentContext()) {
      this.sendExtensionMessage({
        action: 'STOP',
        type: 'STOP',
        playbackId: this.currentPlayingId
      }).catch(() => {});
    }
  }

  /**
   * Standard status query matching canonical extension contract (GET_STATUS)
   */
  public async getStatus(): Promise<{ isSpeaking: boolean; activeEngine: FarsiTtsEngineType }> {
    if (this.isExtensionContext()) {
      try {
        const res = await this.sendExtensionMessage({ action: 'GET_STATUS', type: 'GET_STATUS' });
        if (res?.success && res.status) {
          return {
            isSpeaking: res.status.isSpeaking ?? this.isSpeakingActive,
            activeEngine: res.status.activeEngine || this.activeEngine,
          };
        }
      } catch {}
    }
    return {
      isSpeaking: this.isSpeaking(),
      activeEngine: this.activeEngine,
    };
  }

  public isSpeaking(): boolean {
    return (
      this.isSpeakingActive ||
      espeakEngine.isSpeaking() ||
      piperEngine.isSpeaking() ||
      tinyAvaEngine.isSpeaking() ||
      customTtsEngine.isSpeaking()
    );
  }

  /**
   * IndexedDB Model Management for Piper Neural
   */
  public async getPiperCacheInfo(): Promise<PiperCacheInfo> {
    return indexedDbModelStore.checkCache();
  }

  public subscribePiperCache(cb: (info: PiperCacheInfo) => void): () => void {
    return indexedDbModelStore.subscribe(cb);
  }

  public async downloadPiperModel(onProgress?: (pct: number) => void): Promise<boolean> {
    const success = await indexedDbModelStore.downloadAndCacheModel(onProgress);
    if (success) {
      await piperEngine.init();
      this.notify();
    }
    return success;
  }

  public async clearPiperCache(): Promise<void> {
    await indexedDbModelStore.clearCache();
    this.notify();
  }

  /**
   * Cache API (`tiny-ava-models-v1`) + IndexedDB Model Management for tiny-ava (Parisa / Mana / Maya)
   */
  public async getTinyAvaCacheInfo(cacheStorage?: CacheStorage): Promise<TinyAvaCacheInfo> {
    const idbInfo = await tinyAvaModelStore.checkCache();
    if (idbInfo.status === 'downloading') {
      return idbInfo;
    }

    const summary = await getTinyAvaCacheSummary(cacheStorage);
    if (summary.isParisaReady || summary.isMultiVoiceReady) {
      return {
        status: 'ready',
        modelName: summary.isMultiVoiceReady ? 'tiny-ava-v2' : 'tiny-ava-parisa',
        sizeBytes: summary.totalBytes,
        loadedBytes: summary.totalBytes,
        totalBytes: summary.totalBytes,
        cachedVoices: summary.cachedVoices,
        downloadProgress: 100,
        cacheVersion: TINY_AVA_CACHE_VERSION,
        isOfflineReady: true,
      };
    }

    if (idbInfo.isOfflineReady) {
      return {
        ...idbInfo,
        loadedBytes: idbInfo.sizeBytes,
        totalBytes: idbInfo.sizeBytes,
        cachedVoices: ['parisa', 'mana', 'maya'],
      };
    }

    return {
      ...idbInfo,
      cachedVoices: [],
    };
  }

  public subscribeTinyAvaCache(cb: (info: TinyAvaCacheInfo) => void): () => void {
    const unsubStore = tinyAvaModelStore.subscribe((info) => {
      if (info.status === 'downloading' || info.isOfflineReady) {
        cb(info);
      } else {
        this.getTinyAvaCacheInfo().then(cb).catch(() => cb(info));
      }
    });
    this.getTinyAvaCacheInfo().then(cb).catch(() => {});
    return unsubStore;
  }

  public async downloadTinyAvaModel(
    onProgress?: (pct: number) => void,
    voice?: TinyAvaVoiceId,
    options?: { cacheStorage?: CacheStorage; fetchImpl?: typeof fetch }
  ): Promise<boolean> {
    const targetVoice: TinyAvaVoiceId = voice || this.tinyAvaVoice || 'parisa';
    const hasCacheApi = Boolean(
      options?.cacheStorage || (typeof caches !== 'undefined' && typeof caches.open === 'function')
    );

    if (hasCacheApi) {
      try {
        await ensureTinyAvaModelsCached({
          voice: targetVoice,
          cacheStorage: options?.cacheStorage,
          fetchImpl: options?.fetchImpl,
          onProgress: (p) => {
            onProgress?.(p.percent);
            tinyAvaModelStore.reportExternalDownloadProgress({
              file: p.file,
              totalLoadedBytes: p.totalLoadedBytes,
              totalExpectedBytes: p.totalExpectedBytes,
              percent: Math.min(99, p.percent),
              cached: p.cached,
            });
          },
        });

        const summary = await getTinyAvaCacheSummary(options?.cacheStorage);
        tinyAvaModelStore.reportExternalDownloadProgress({
          file: targetVoice === 'parisa' ? 'tiny-ava-parisa.onnx' : 'tiny-ava-v2.onnx',
          totalLoadedBytes: summary.totalBytes,
          totalExpectedBytes: summary.totalBytes,
          percent: 100,
          cachedVoices: summary.cachedVoices,
          cached: false,
        });
        onProgress?.(100);

        // Warm up ONNX sessions in browser environments without failing download if ORT isn't present in headless tests
        if (!options?.cacheStorage) {
          await tinyAvaEngine.init({ voice: targetVoice }).catch(() => false);
        }

        if (!this.hasExplicitUserEngineChoice) {
          this.activeEngine = 'tiny-ava';
        }
        this.notify();
        return true;
      } catch (err: any) {
        const msg = err?.message || 'tiny-ava model download failed';
        tinyAvaModelStore.reportExternalCacheState({
          status: 'error',
          modelName: TINY_AVA_MODEL_ID,
          sizeBytes: 0,
          downloadProgress: 0,
          errorMessage: msg,
          errorCategory: 'DOWNLOAD_FAILED',
          isOfflineReady: false,
        });
        this.notify();
        return false;
      }
    }

    const success = await tinyAvaModelStore.downloadAndCacheModel(onProgress);
    if (success) {
      await tinyAvaEngine.init({ voice: targetVoice }).catch(() => false);
      if (!this.hasExplicitUserEngineChoice) {
        this.activeEngine = 'tiny-ava';
      }
      this.notify();
    }
    return success;
  }

  public async clearTinyAvaCache(cacheStorage?: CacheStorage): Promise<void> {
    tinyAvaEngine.dispose();
    await clearTinyAvaModelCache(cacheStorage);
    await tinyAvaModelStore.clearCache();
    if (this.isExtensionContext() && !this.isOffscreenDocumentContext()) {
      await this.sendExtensionMessage({
        action: 'CLEAR_TINY_AVA_CACHE',
        type: 'CLEAR_TINY_AVA_CACHE',
      }).catch(() => {});
    }
    tinyAvaModelStore.reportExternalCacheState({
      status: 'not_cached',
      modelName: TINY_AVA_MODEL_ID,
      sizeBytes: 0,
      loadedBytes: 0,
      totalBytes: 0,
      cachedVoices: [],
      downloadProgress: 0,
      isOfflineReady: false,
    });
    this.notify();
  }

  /**
   * Quick preview test
   */
  public async preview(
    engine: FarsiTtsEngineType = this.activeEngine,
    speed: number = 1.0,
    pitch: number = 1.0,
    volume: number = 1.0,
    onFallback?: (msg: string) => void,
    sampleText?: string,
    voice?: TinyAvaVoiceId
  ): Promise<void> {
    const effectiveVoice = voice || this.tinyAvaVoice;
    const defaultText =
      engine === 'custom'
        ? 'Custom TTS endpoint active. Ready to focus and read.'
        : engine === 'tiny-ava' && effectiveVoice === 'maya'
          ? 'Hello, this is Maya from tiny-ava speaking completely offline.'
          : SAMPLE_FARSI_TEXT;
    const textToSpeak = sampleText || defaultText;
    return this.speak(textToSpeak, {
      engine,
      voice: effectiveVoice,
      speed,
      pitch,
      volume,
      onFallback,
    });
  }
}

export const farsiOfflineTts = new FarsiOfflineTtsManager();
