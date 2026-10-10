/**
 * Engine 2: Piper Neural TTS (ONNX Runtime Web)
 * 
 * High-quality, neural, human-like voice synthesis running via ONNX Runtime WebAssembly/WebGPU.
 * Loads quantized Farsi model (fa_IR-amir-medium) from IndexedDB so it is 100% offline.
 * Automatically and gracefully falls back to eSpeak NG (WASM) if the model is not yet cached,
 * if WASM compilation is unavailable, or if memory limits are exceeded.
 */

import { FarsiTtsOptions, SynthesisResult, PiperDirectResult, TtsEngine } from './types';
import { indexedDbModelStore, DEFAULT_PIPER_MODEL_NAME } from './indexedDbModelStore';
import { farsiTextToPiperTokens, normalizeFarsiText } from './farsiPhonemizer';
import { extractPiperAudioSamples, encodePcmWav, playAudioBlob, AudioPlaybackHandle } from './audioUtils';
import { splitIntoSentences } from './phonemizer/persianNormalizer';
import { validatePiperModelConfig } from './modelValidation';

// Lazy loader for onnxruntime-web to avoid premature WASM instantiation on app load
let cachedOrtModule: any = null;
let ortLoadPromise: Promise<any> | null = null;

export async function getOrt(): Promise<any> {
  // Check globalThis.ort first (e.g. Chrome Extension offscreen or pre-loaded script)
  if (typeof (globalThis as any).ort !== 'undefined' && (globalThis as any).ort?.InferenceSession) {
    cachedOrtModule = (globalThis as any).ort;
    return cachedOrtModule;
  }

  if (cachedOrtModule) return cachedOrtModule;
  if (ortLoadPromise) return ortLoadPromise;

  ortLoadPromise = (async () => {
    try {
      const ort = await import('onnxruntime-web');
      if (ort?.env?.wasm) {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          ort.env.wasm.wasmPaths = chrome.runtime.getURL('');
        } else {
          ort.env.wasm.wasmPaths = '/';
        }
        ort.env.wasm.numThreads = Math.min(2, Math.max(1, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 2) || 2) - 1);
        ort.env.wasm.simd = true;
      }
      cachedOrtModule = ort;
      return ort;
    } catch (err) {
      console.warn('Could not dynamically load onnxruntime-web, will use eSpeak fallback:', err);
      return null;
    } finally {
      ortLoadPromise = null;
    }
  })();

  return ortLoadPromise;
}

export class PiperEngine implements TtsEngine {
  public readonly name = 'Piper Neural (ONNX Web)';
  public readonly engineType = 'piper' as const;

  private session: any = null;
  private modelConfig: any = null;
  private initPromise: Promise<boolean> | null = null;
  private lastInitError: { message: string; category?: any } | null = null;
  private isCurrentlySpeaking: boolean = false;
  private sampleRate: number = 22050;
  private currentPlaybackHandle: AudioPlaybackHandle | null = null;

  constructor() {
    // No eager initialization to prevent premature WASM instantiation or network fetches
  }

  /**
   * Inject mock session and config for testing and regression suites
   */
  public setSessionForTesting(mockSession: any, mockConfig?: any): void {
    this.session = mockSession;
    if (mockConfig) {
      this.modelConfig = mockConfig;
      if (mockConfig.audio?.sample_rate) {
        this.sampleRate = mockConfig.audio.sample_rate;
      }
    }
  }

  /**
   * Standard initialize method
   */
  public async initialize(): Promise<void> {
    await this.init();
  }

  /**
   * Initializes the ONNX session using model cached in IndexedDB
   */
  public async init(): Promise<boolean> {
    if (this.session) return true;
    // Share a single in-flight init promise so concurrent callers wait instead of
    // each concluding "not ready" and spuriously triggering the eSpeak fallback.
    if (this.initPromise) return this.initPromise;

    this.lastInitError = null;
    this.initPromise = (async (): Promise<boolean> => {
      try {
        // 1. Check local offline cache first: do NOT load ONNX if model is not present in IndexedDB
        const cached = await indexedDbModelStore.getModel(DEFAULT_PIPER_MODEL_NAME);
        if (!cached || !cached.onnxBytes || cached.onnxBytes.byteLength < 5000) {
          this.lastInitError = {
            message: 'Piper neural model not cached in IndexedDB',
            category: 'STORAGE_FAILED',
          };
          return false;
        }

        // Validate config
        const validation = validatePiperModelConfig(cached.config, DEFAULT_PIPER_MODEL_NAME);
        if (!validation.valid || !validation.config) {
          console.error('Piper model initialization failed: invalid config in IndexedDB:', validation.error);
          this.lastInitError = {
            message: `parse failed: ${validation.error || 'invalid config in IndexedDB'}`,
            category: 'PARSE_FAILED',
          };
          return false;
        }

        this.modelConfig = validation.config;
        if (this.modelConfig?.audio?.sample_rate) {
          this.sampleRate = this.modelConfig.audio.sample_rate;
        }

        // 2. Lazily load ONNX Runtime Web
        const ort = await getOrt();
        if (!ort || !ort.InferenceSession) {
          console.warn('ONNX Runtime unavailable in environment');
          this.lastInitError = {
            message: 'model initialization failed: ONNX Runtime Web unavailable in environment',
            category: 'INIT_FAILED',
          };
          return false;
        }

        // 3. Create ONNX inference session with WebAssembly
        const sessionOptions = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        };

        this.session = await ort.InferenceSession.create(cached.onnxBytes, sessionOptions);
        console.log('✓ Piper Farsi ONNX Inference Session initialized (100% offline)');
        return true;
      } catch (err: any) {
        console.warn('Could not initialize Piper ONNX session, fallback available:', err);
        this.session = null;
        this.lastInitError = {
          message: `model initialization failed: ${err?.message || 'ONNX session creation error'}`,
          category: 'INIT_FAILED',
        };
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public isModelReady(): boolean {
    return this.session !== null;
  }

  /**
   * Direct Piper ONNX synthesis without fallback invocation.
   * Returns explicit success: true with Piper wavBlob or success: false with error.
   */
  public async synthesizeDirect(text: string, options: FarsiTtsOptions = {}): Promise<PiperDirectResult> {
    const isReady = await this.init();
    if (!isReady || !this.session) {
      return {
        success: false,
        engineUsed: 'piper',
        error: this.lastInitError?.message || 'ONNX Runtime unavailable or Piper neural model not cached in IndexedDB',
        errorCategory: this.lastInitError?.category || 'INIT_FAILED',
      };
    }

    try {
      const normalized = normalizeFarsiText(text);
      if (!normalized) {
        const emptySamples = new Float32Array(0);
        return {
          success: true,
          engineUsed: 'piper',
          wavBlob: encodePcmWav(emptySamples, this.sampleRate),
          durationMs: 0,
          sampleRate: this.sampleRate,
        };
      }

      const ort = await getOrt();
      if (!ort) {
        return {
          success: false,
          engineUsed: 'piper',
          error: 'ONNX Runtime unavailable',
        };
      }

      const speed = Math.max(0.5, Math.min(2.0, options.speed ?? 1.0));
      const phonemeMap = this.modelConfig?.phoneme_id_map || undefined;

      // Run inference once per sentence (Piper is trained per sentence; a whole paragraph as one
      // sequence degrades prosody and can exceed the model's comfortable length).
      const sentences = splitIntoSentences(normalized);
      const sentenceAudio: Float32Array[] = [];
      for (const sentence of sentences) {
        const tokens = await farsiTextToPiperTokens(sentence, phonemeMap);
        if (!tokens || tokens.length <= 2) {
          throw new Error('Tokenization resulted in empty token sequence');
        }
        sentenceAudio.push(await this.runInference(tokens, speed, ort));
      }

      // Concatenate sentence audio with a short inter-sentence silence.
      const silenceSamples = Math.floor(this.sampleRate * 0.25);
      const totalSamples = sentenceAudio.reduce((acc, s) => acc + s.length, 0) + silenceSamples * Math.max(0, sentenceAudio.length - 1);
      const combined = new Float32Array(totalSamples);
      let offset = 0;
      for (let i = 0; i < sentenceAudio.length; i++) {
        combined.set(sentenceAudio[i], offset);
        offset += sentenceAudio[i].length;
        if (i < sentenceAudio.length - 1) {
          offset += silenceSamples; // zeros already in place
        }
      }

      const wavBlob = encodePcmWav(combined, this.sampleRate);
      const durationMs = Math.round((combined.length / this.sampleRate) * 1000);

      return {
        success: true,
        engineUsed: 'piper',
        wavBlob,
        durationMs,
        sampleRate: this.sampleRate,
      };
    } catch (inferenceErr: any) {
      console.warn('Piper inference error:', inferenceErr);
      return {
        success: false,
        engineUsed: 'piper',
        error: `inference failed: ${inferenceErr?.message || 'Piper inference error'}`,
        errorCategory: 'INFERENCE_FAILED',
      };
    }
  }

  /**
   * Runs a single ONNX inference pass for one tokenized sentence and returns raw float samples.
   */
  private async runInference(tokens: number[], speed: number, ort: any): Promise<Float32Array> {
    // Prepare tensors
    const tokenArray = BigInt64Array.from(tokens.map((t) => BigInt(t)));
    const inputTensor = new ort.Tensor('int64', tokenArray, [1, tokens.length]);
    const inputLengthsTensor = new ort.Tensor('int64', BigInt64Array.from([BigInt(tokens.length)]), [1]);

    // Scales: [noise_scale, length_scale, noise_w]
    const noiseScale = this.modelConfig?.inference?.noise_scale ?? 0.667;
    const lengthScale = (this.modelConfig?.inference?.length_scale ?? 1.0) / speed;
    const noiseW = this.modelConfig?.inference?.noise_w ?? 0.8;
    const scalesTensor = new ort.Tensor('float32', new Float32Array([noiseScale, lengthScale, noiseW]), [3]);

    const feeds: Record<string, any> = {
      input: inputTensor,
      input_lengths: inputLengthsTensor,
      scales: scalesTensor,
    };

    // Add speaker ID if model supports multi-speaker
    if (this.session.inputNames && this.session.inputNames.includes('sid')) {
      feeds['sid'] = new ort.Tensor('int64', BigInt64Array.from([BigInt(0)]), [1]);
    }

    // Run inference
    const results = await this.session.run(feeds);
    const outputTensor = (this.session.outputNames && results[this.session.outputNames[0]]) || results.output;

    if (!outputTensor) {
      throw new Error('Piper inference returned empty audio output tensor');
    }

    return Float32Array.from(extractPiperAudioSamples(outputTensor));
  }

  /**
   * Synthesize Farsi text into audio.
   * PiperEngine ONLY synthesizes via Piper neural model.
   * If Piper succeeds, returns honest Piper WAV audio.
   * If Piper is unavailable or fails, returns success: false with error details.
   * It NEVER secretly invokes eSpeak fallback — the FarsiOfflineTtsManager is in charge of fallback!
   */
  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const directRes = await this.synthesizeDirect(text, options);

    // 1. Piper succeeded: return honest Piper audio
    if (directRes.success && directRes.wavBlob) {
      return {
        success: true,
        wavBlob: directRes.wavBlob,
        durationMs: directRes.durationMs ?? 0,
        sampleRate: directRes.sampleRate ?? this.sampleRate,
        engineUsed: 'piper',
        fallbackTriggered: false,
      };
    }

    // 2. Piper failed or unavailable: honest failure reporting
    return {
      success: false,
      wavBlob: encodePcmWav(new Float32Array(0), this.sampleRate),
      durationMs: 0,
      sampleRate: this.sampleRate,
      engineUsed: 'piper',
      fallbackTriggered: false,
      error: directRes.error || 'Piper neural synthesis unavailable or model not cached',
      errorCategory: directRes.errorCategory,
    };
  }

  /**
   * Play speech with clean interruption
   */
  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;

    try {
      const result = await this.synthesize(text, options);
      if (!result.success || !result.wavBlob) {
        this.isCurrentlySpeaking = false;
        options.onError?.(new Error(result.error || 'Piper audio synthesis produced no audio data'));
        return;
      }

      await this.playWavBlob(result.wavBlob, options);
    } catch (err: any) {
      this.isCurrentlySpeaking = false;
      this.currentPlaybackHandle = null;
      options.onError?.(err);
      throw err;
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

  public stop(): void {
    if (this.currentPlaybackHandle) {
      try {
        this.currentPlaybackHandle.stop();
      } catch {}
      this.currentPlaybackHandle = null;
    }
    this.isCurrentlySpeaking = false;
  }

  public dispose(): void {
    this.stop();
    if (this.session && typeof this.session.release === 'function') {
      try { this.session.release(); } catch {}
    }
    this.session = null;
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }
}

export const piperEngine = new PiperEngine();
