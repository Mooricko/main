/**
 * Engine 1: Real eSpeak NG WebAssembly Voice Synthesizer & G2P Phonemizer
 * 
 * Production-grade offline eSpeak NG engine:
 * - 100% offline, zero external cloud dependencies
 * - Full Persian / Farsi language support (voice: "fa")
 * - Independent G2P phonemization (phonemize -> IPA string)
 * - True eSpeak NG WASM audio synthesis (synthesize -> 22050Hz 16-bit mono WAV)
 * - Deterministic, browser and extension offscreen document compatible
 */

import { FarsiTtsOptions, SynthesisResult, TtsEngine, FarsiEspeak } from './types';
import { normalizePersianText } from './phonemizer/persianNormalizer';
import { farsiPhonemizer } from './phonemizer/espeakPhonemizer';
import { encodePcmWav, playAudioBlob, AudioPlaybackHandle } from './audioUtils';

/**
 * Legacy formant interface preserved solely for backwards compatibility
 * @deprecated Real eSpeak NG WASM synthesis does not use manual formant tables
 */
export interface PhonemeFormants {
  f1: number;
  f2: number;
  f3: number;
  durationScale: number;
  isVoiced: boolean;
  isFricative?: boolean;
  isPlosive?: boolean;
}

/**
 * @deprecated Legacy manual formant table. Real eSpeak NG uses compiled voice data (fa_dict / phondata).
 */
export const FARSI_PHONEME_TABLE: Record<string, PhonemeFormants> = {
  'DEFAULT': { f1: 500, f2: 1500, f3: 2500, durationScale: 1.0, isVoiced: true },
};

export class EspeakEngine implements TtsEngine, FarsiEspeak {
  public readonly name = 'eSpeak NG (WASM)';
  public readonly engineType = 'espeak' as const;
  public readonly voice = 'fa';

  private readonly sampleRate = 22050;
  private isCurrentlySpeaking = false;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private cachedWasmBinary: ArrayBuffer | null = null;
  private currentPlaybackHandle: AudioPlaybackHandle | null = null;

  constructor() {
    // Lazily initialized
  }

  /**
   * Initializes the eSpeak NG WebAssembly environment and prefetches wasm assets
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const isNode = typeof process !== 'undefined' && !!process.versions?.node;
        const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL;

        if (isNode) {
          // Node.js environment: load wasm binary directly from node_modules if present
          try {
            const fs = await import('node:fs');
            const { createRequire } = await import('node:module');
            const req = createRequire(import.meta.url);
            const wasmPath = req.resolve('espeak-ng/dist/espeak-ng.wasm');
            if (fs.existsSync(wasmPath)) {
              const buf = fs.readFileSync(wasmPath);
              this.cachedWasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            }
          } catch {
            // Emscripten Node will handle file reading
          }
        } else if (typeof fetch === 'function') {
          // Browser or Chrome Extension: prefetch and cache wasm binary in memory
          try {
            const wasmUrl = isExtension
              ? chrome.runtime.getURL('espeak-ng.wasm')
              : '/espeak-ng.wasm';
            const resp = await fetch(wasmUrl);
            if (resp.ok) {
              this.cachedWasmBinary = await resp.arrayBuffer();
            }
          } catch (fetchErr) {
            console.debug('Prefetching espeak-ng.wasm failed, falling back to dynamic locateFile:', fetchErr);
          }
        }

        // Initialize phonemizer as well so G2P is warm
        await farsiPhonemizer.init();

        this.isInitialized = true;
        console.log('✓ Real eSpeak NG WASM Engine initialized successfully (voice: fa)');
      } catch (err) {
        console.error('Failed to initialize eSpeak NG WASM engine:', err);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async init(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run an eSpeak NG WASM CLI invocation inside the WebAssembly sandbox
   */
  private async runEspeakInstance(args: string[]): Promise<any> {
    const isNode = typeof process !== 'undefined' && !!process.versions?.node;
    const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.getURL;

    const moduleConfig: any = {
      arguments: args,
      noInitialRun: false,
    };

    if (this.cachedWasmBinary) {
      moduleConfig.wasmBinary = this.cachedWasmBinary;
    } else if (!isNode) {
      const wasmUrl = isExtension
        ? chrome.runtime.getURL('espeak-ng.wasm')
        : '/espeak-ng.wasm';
      moduleConfig.locateFile = (file: string) => {
        if (file.endsWith('.wasm')) return wasmUrl;
        return file;
      };
    }

    const { default: ESpeakNG } = await import('espeak-ng');
    return await ESpeakNG(moduleConfig);
  }

  /**
   * Operation A: Real eSpeak NG G2P Phonemization for Persian
   * Persian text -> eSpeak NG / fa -> IPA phoneme string
   */
  public async phonemize(text: string): Promise<string> {
    const normalized = normalizePersianText(text);
    if (!normalized) return '';

    await this.initialize();

    // Use fast in-memory phonemizer or fallback to direct ESpeakNG instance
    try {
      return await farsiPhonemizer.phonemize(normalized);
    } catch {
      const es = await this.runEspeakInstance([
        '-v', this.voice,
        '--ipa=3',
        '-q',
        '--phonout=ph.txt',
        normalized
      ]);
      const phonemes = es.FS.readFile('ph.txt', { encoding: 'utf8' }) || '';
      try { es.FS.unlink('ph.txt'); } catch {}
      return phonemes.trim();
    }
  }

  /**
   * Operation B: Real eSpeak NG Audio Synthesis for Persian
   * Persian text -> eSpeak NG / fa -> WAV audio blob
   */
  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const normalized = normalizePersianText(text);

    if (!normalized) {
      const emptyBlob = encodePcmWav(new Float32Array(0), this.sampleRate);
      return {
        success: true,
        wavBlob: emptyBlob,
        durationMs: 0,
        sampleRate: this.sampleRate,
        engineUsed: 'espeak',
        fallbackTriggered: false,
      };
    }

    await this.initialize();

    const speed = Math.max(0.5, Math.min(2.0, options.speed ?? 1.0));
    const pitch = Math.max(0.6, Math.min(1.4, options.pitch ?? 1.0));
    const volume = Math.max(0.0, Math.min(1.0, options.volume ?? 1.0));

    // Calculate eSpeak CLI parameters
    // Normal speed is ~175 WPM
    const speedWpm = Math.round(175 * speed);
    // Normal pitch is 50 (range 0 to 99)
    const pitchVal = Math.round(50 * pitch);
    // Normal amplitude is 100 (range 0 to 200)
    const ampVal = Math.round(100 * volume);

    const outFileName = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`;

    const args = [
      '-v', this.voice,
      '-s', speedWpm.toString(),
      '-p', pitchVal.toString(),
      '-a', ampVal.toString(),
      '-w', outFileName,
      // `--` ends option parsing so text starting with '-' (e.g. "-5 درجه") is not
      // misinterpreted as a CLI flag (which crashes eSpeak with ENOENT).
      '--',
      normalized
    ];

    try {
      const es = await this.runEspeakInstance(args);
      const wavBytes = es.FS.readFile(outFileName);
      try {
        es.FS.unlink(outFileName);
      } catch {}

      const wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
      const samples = Math.max(0, (wavBytes.length - 44) / 2);
      const durationMs = Math.round((samples / this.sampleRate) * 1000);

      return {
        success: true,
        wavBlob,
        durationMs,
        sampleRate: this.sampleRate,
        engineUsed: 'espeak',
        fallbackTriggered: false,
      };
    } catch (err: any) {
      console.error('eSpeak NG WASM synthesis error:', err);
      return {
        success: false,
        wavBlob: encodePcmWav(new Float32Array(0), this.sampleRate),
        durationMs: 0,
        sampleRate: this.sampleRate,
        engineUsed: 'espeak',
        fallbackTriggered: false,
        error: err?.message || 'eSpeak NG WASM synthesis failed',
      };
    }
  }

  /**
   * Plays synthesized speech through browser audio output
   */
  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;

    try {
      const res = await this.synthesize(text, options);
      if (!res.success) {
        this.isCurrentlySpeaking = false;
        options.onError?.(new Error(res.error || 'eSpeak synthesis failed'));
        return;
      }

      this.currentPlaybackHandle = await playAudioBlob(res.wavBlob, {
        volume: options.volume ?? 1.0,
        onStart: () => {
          options.onStart?.();
        },
        onEnd: () => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onEnd?.();
        },
        onError: (err) => {
          this.isCurrentlySpeaking = false;
          this.currentPlaybackHandle = null;
          options.onError?.(err);
        },
      });
    } catch (err: any) {
      this.isCurrentlySpeaking = false;
      this.currentPlaybackHandle = null;
      options.onError?.(err);
    }
  }

  /**
   * Helper to play an already-synthesized WAV blob
   */
  public async playWavBlob(blob: Blob, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;

    this.currentPlaybackHandle = await playAudioBlob(blob, {
      volume: options.volume ?? 1.0,
      onStart: () => {
        options.onStart?.();
      },
      onEnd: () => {
        this.isCurrentlySpeaking = false;
        this.currentPlaybackHandle = null;
        options.onEnd?.();
      },
      onError: (err) => {
        this.isCurrentlySpeaking = false;
        this.currentPlaybackHandle = null;
        options.onError?.(err);
      },
    });
  }

  /**
   * Stops any currently playing audio
   */
  public stop(): void {
    if (this.currentPlaybackHandle) {
      try {
        this.currentPlaybackHandle.stop();
      } catch {}
      this.currentPlaybackHandle = null;
    }
    this.isCurrentlySpeaking = false;
  }

  /**
   * Disposes engine and releases audio resources
   */
  public dispose(): void {
    this.stop();
    this.cachedWasmBinary = null;
    this.isInitialized = false;
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }
}

export const espeakEngine = new EspeakEngine();
