/**
 * Engine 2: Piper Neural TTS (ONNX Runtime Web)
 * 
 * High-quality, neural, human-like voice synthesis running via ONNX Runtime WebAssembly/WebGPU.
 * Loads quantized Farsi model (fa_IR-amir-medium) from IndexedDB so it is 100% offline.
 * Automatically and gracefully falls back to eSpeak NG (WASM) if the model is not yet cached,
 * if WASM compilation is unavailable, or if memory limits are exceeded.
 */

import { FarsiTtsOptions, SynthesisResult, TtsEngineInterface } from './types';
import { indexedDbModelStore, DEFAULT_PIPER_MODEL_NAME } from './indexedDbModelStore';
import { farsiTextToPiperTokens, encodePcmWav, normalizeFarsiText } from './farsiPhonemizer';
import { espeakEngine } from './espeakEngine';

// Lazy loader for onnxruntime-web to avoid premature WASM instantiation on app load
let cachedOrtModule: any = null;
let ortLoadPromise: Promise<any> | null = null;

async function getOrt(): Promise<any> {
  if (cachedOrtModule) return cachedOrtModule;
  if (ortLoadPromise) return ortLoadPromise;

  ortLoadPromise = (async () => {
    try {
      const ort = await import('onnxruntime-web');
      if (ort?.env?.wasm) {
        // Safe thread and SIMD configuration without premature instantiation
        ort.env.wasm.numThreads = Math.min(2, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
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

export class PiperEngine implements TtsEngineInterface {
  public readonly name = 'Piper Neural (ONNX Web)';
  public readonly engineType = 'piper' as const;

  private session: any = null;
  private modelConfig: any = null;
  private isInitializing: boolean = false;
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private isCurrentlySpeaking: boolean = false;
  private sampleRate: number = 22050;

  constructor() {
    // No eager initialization to prevent premature WASM instantiation or network fetches
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        return this.audioCtx;
      }
    }
    return null;
  }

  /**
   * Initializes the ONNX session using model cached in IndexedDB
   */
  public async init(): Promise<boolean> {
    if (this.session) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      // 1. Check local offline cache first: do NOT load ONNX if model is not present in IndexedDB
      const cached = await indexedDbModelStore.getModel(DEFAULT_PIPER_MODEL_NAME);
      if (!cached || !cached.onnxBytes || cached.onnxBytes.byteLength < 5000) {
        this.isInitializing = false;
        return false;
      }

      this.modelConfig = cached.config;
      if (this.modelConfig?.audio?.sample_rate) {
        this.sampleRate = this.modelConfig.audio.sample_rate;
      }

      // 2. Lazily load ONNX Runtime Web
      const ort = await getOrt();
      if (!ort || !ort.InferenceSession) {
        this.isInitializing = false;
        return false;
      }

      // 3. Create ONNX inference session with WebAssembly
      const sessionOptions = {
        executionProviders: ['wasm', 'cpu'],
        graphOptimizationLevel: 'all',
      };

      this.session = await ort.InferenceSession.create(cached.onnxBytes, sessionOptions);
      this.isInitializing = false;
      console.log('✓ Piper Farsi ONNX Inference Session initialized (100% offline)');
      return true;
    } catch (err) {
      console.warn('Could not initialize Piper ONNX session, fallback available:', err);
      this.session = null;
      this.isInitializing = false;
      return false;
    }
  }

  public isModelReady(): boolean {
    return this.session !== null;
  }

  /**
   * Synthesize Farsi text into audio.
   * If Piper is not ready or errors out, automatically falls back to eSpeak NG WASM!
   */
  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const isReady = await this.init();

    // Graceful Fallback if model not downloaded / cached or session failed
    if (!isReady || !this.session) {
      const reason = 'Piper neural model not cached in IndexedDB or initialization failed. Falling back to eSpeak NG WASM.';
      options.onFallback?.(reason);

      const fallbackResult = await espeakEngine.synthesize(text, options);
      return {
        ...fallbackResult,
        fallbackTriggered: true,
        fallbackReason: reason,
      };
    }

    try {
      const normalized = normalizeFarsiText(text);
      if (!normalized) {
        const emptySamples = new Float32Array(0);
        return {
          wavBlob: encodePcmWav(emptySamples, this.sampleRate),
          durationMs: 0,
          sampleRate: this.sampleRate,
          engineUsed: 'piper',
          fallbackTriggered: false,
        };
      }

      const ort = await getOrt();
      if (!ort) throw new Error('ONNX runtime unavailable');

      const speed = Math.max(0.5, Math.min(2.0, options.speed ?? 1.0));
      const phonemeMap = this.modelConfig?.phoneme_id_map || undefined;
      const tokens = farsiTextToPiperTokens(normalized, phonemeMap);

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

      if (!outputTensor || !outputTensor.data) {
        throw new Error('Piper inference returned empty audio output');
      }

      const rawFloatData = outputTensor.data as Float32Array;
      const wavBlob = encodePcmWav(rawFloatData, this.sampleRate);
      const durationMs = Math.round((rawFloatData.length / this.sampleRate) * 1000);

      return {
        wavBlob,
        durationMs,
        sampleRate: this.sampleRate,
        engineUsed: 'piper',
        fallbackTriggered: false,
      };
    } catch (inferenceErr: any) {
      console.warn('Piper inference error, falling back to eSpeak NG:', inferenceErr);
      const reason = `Piper inference failure (${inferenceErr?.message || 'unknown'}). Falling back to eSpeak NG WASM.`;
      options.onFallback?.(reason);

      const fallbackResult = await espeakEngine.synthesize(text, options);
      return {
        ...fallbackResult,
        fallbackTriggered: true,
        fallbackReason: reason,
      };
    }
  }

  /**
   * Play speech with clean interruption
   */
  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();

    const ctx = this.getAudioContext();
    if (!ctx) {
      options.onError?.(new Error('AudioContext not available'));
      return;
    }

    try {
      options.onStart?.();
      this.isCurrentlySpeaking = true;

      const { wavBlob } = await this.synthesize(text, options);
      const arrayBuffer = await wavBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, options.volume ?? 1.0));

      source.connect(gain);
      gain.connect(ctx.destination);

      this.currentSource = source;
      this.currentGain = gain;

      source.onended = () => {
        this.isCurrentlySpeaking = false;
        this.currentSource = null;
        options.onEnd?.();
      };

      source.start(0);
    } catch (err: any) {
      this.isCurrentlySpeaking = false;
      this.currentSource = null;
      options.onError?.(err);
      throw err;
    }
  }

  public stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop(0);
        this.currentSource.disconnect();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch {
        // ignore
      }
      this.currentGain = null;
    }
    this.isCurrentlySpeaking = false;
    espeakEngine.stop();
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking || espeakEngine.isSpeaking();
  }
}

export const piperEngine = new PiperEngine();
