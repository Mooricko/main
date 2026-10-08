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

import { FarsiTtsEngineType, FarsiTtsOptions, SynthesisResult, PiperCacheInfo } from './types';
import { espeakEngine } from './espeakEngine';
import { piperEngine } from './piperEngine';
import { indexedDbModelStore } from './indexedDbModelStore';
import { safeStorage } from '../../utils/safeStorage';

const STORAGE_KEY_ENGINE = 'adhd_reader_farsi_tts_engine';
const STORAGE_KEY_SPEED = 'adhd_reader_farsi_tts_speed';
const STORAGE_KEY_PITCH = 'adhd_reader_farsi_tts_pitch';

export const SAMPLE_FARSI_TEXT = 'این یک آزمایش برای سیستم تبدیل متن به گفتار آفلاین فارسی است.';

class FarsiOfflineTtsManager {
  private activeEngine: FarsiTtsEngineType = 'espeak';
  private currentPlayingId: number = 0;
  private isSpeakingActive: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadSavedSettings();
  }

  private loadSavedSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedEngine = safeStorage.getItem(STORAGE_KEY_ENGINE) as FarsiTtsEngineType | null;
      if (savedEngine === 'espeak' || savedEngine === 'piper') {
        this.activeEngine = savedEngine;
      }

      // Check if Chrome Extension storage has a preference
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(['farsiTtsEngine'], (res) => {
          if (res?.farsiTtsEngine === 'espeak' || res?.farsiTtsEngine === 'piper') {
            this.activeEngine = res.farsiTtsEngine;
            this.notify();
          }
        });
      }
    } catch {
      // fallback
    }
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

  public setEngine(engine: FarsiTtsEngineType): void {
    this.activeEngine = engine;
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

  private sendExtensionMessage(payload: any): Promise<any> {
    if (!this.isExtensionContext()) {
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
   * Synthesize text into audio buffer / WAV Blob
   */
  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const engineType = options.engine || this.activeEngine;

    if (engineType === 'piper') {
      return piperEngine.synthesize(text, options);
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
    this.notify();

    const engineType = options.engine || this.activeEngine;

    // 2. If running inside Chrome Extension with offscreen support, delegate via message
    if (this.isExtensionContext()) {
      try {
        const res = await this.sendExtensionMessage({
          action: 'SPEAK',
          text,
          engine: engineType,
          speed: options.speed ?? 1.0,
          pitch: options.pitch ?? 1.0,
          volume: options.volume ?? 1.0,
        });

        if (res && res.success) {
          options.onStart?.();
          return;
        }
      } catch (extErr) {
        console.debug('Extension offscreen message failed, falling back to local synthesizer:', extErr);
      }
    }

    // 3. In-browser direct speech playback
    const wrappedOptions: FarsiTtsOptions = {
      ...options,
      onStart: () => {
        if (this.currentPlayingId === playbackId) {
          options.onStart?.();
        }
      },
      onEnd: () => {
        if (this.currentPlayingId === playbackId) {
          this.isSpeakingActive = false;
          this.notify();
          options.onEnd?.();
        }
      },
      onError: (err) => {
        if (this.currentPlayingId === playbackId) {
          this.isSpeakingActive = false;
          this.notify();
          options.onError?.(err);
        }
      },
      onFallback: (reason) => {
        options.onFallback?.(reason);
      },
    };

    if (engineType === 'piper') {
      await piperEngine.speak(text, wrappedOptions);
    } else {
      await espeakEngine.speak(text, wrappedOptions);
    }
  }

  /**
   * Immediately stops any active audio playback
   */
  public stop(): void {
    this.currentPlayingId++;
    this.isSpeakingActive = false;

    // Stop local engines
    espeakEngine.stop();
    piperEngine.stop();

    // Stop extension offscreen audio
    if (this.isExtensionContext()) {
      this.sendExtensionMessage({ action: 'STOP' }).catch(() => {});
    }

    this.notify();
  }

  public isSpeaking(): boolean {
    return this.isSpeakingActive || espeakEngine.isSpeaking() || piperEngine.isSpeaking();
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
   * Quick preview test
   */
  public async preview(
    engine: FarsiTtsEngineType = this.activeEngine,
    speed: number = 1.0,
    pitch: number = 1.0,
    volume: number = 1.0,
    onFallback?: (msg: string) => void
  ): Promise<void> {
    return this.speak(SAMPLE_FARSI_TEXT, {
      engine,
      speed,
      pitch,
      volume,
      onFallback,
    });
  }
}

export const farsiOfflineTts = new FarsiOfflineTtsManager();
