/**
 * Engine 3: tiny-ava Neural Farsi TTS Adapter (ONNX Runtime Web + Web Audio 24 kHz)
 *
 * Ports the canonical inference pipeline from `mallahyari/tiny-ava` (`demo/worker.js`)
 * to implement our `TtsEngine` interface cleanly in both the web app and Chrome
 * Extension Manifest V3 offscreen document:
 *
 * 1. Configures `onnxruntime-web` before session creation via `ortLoader`:
 *    - `ort.env.wasm.wasmPaths = chrome.runtime.getURL('wasm/')` (or `'/wasm/'`)
 *    - Single-threaded WASM (`numThreads = 1`) unless crossOriginIsolated + SharedArrayBuffer
 * 2. Lazy-loads the three `ort.InferenceSession` instances (`g2p_encoder`, `g2p_decoder`,
 *    and the selected `tiny-ava` voice model) from our Cache API helper (`tiny-ava-models-v1`)
 *    on first Farsi playback, forwarding byte-level download progress to the UI via our
 *    existing Chrome Extension message bus (falling back to IndexedDB if already cached there).
 * 3. Runs ByT5 UTF-8 Persian G2P inference, maps onto either the 46-symbol Parisa IPA table
 *    (`tiny-ava-parisa.json`) or 84-symbol bilingual table (`tiny-ava-v2.json`), generates
 *    3-class stress/ezafe tensors (`0` unstressed, `1` primary stress, `2` explicit ezafe),
 *    and preserves optional Persian diacritics (`ـَ`, `ـِ`, `ـُ`, `ـّ`) and ZWNJ.
 * 4. Produces 24 kHz mono `Float32Array` waveforms, peak-normalizes whenever `max(|wav|) > 0.99`,
 *    and streams sentence-by-sentence into the 24 kHz Web Audio playback pipeline with immediate
 *    cancellation via `stop()` / `abort()`.
 */

import {
  FarsiTtsOptions,
  SynthesisResult,
  TtsEngine,
  TinyAvaVoiceId,
  PiperErrorCategory,
} from './types';
import { getOrt } from './ortLoader';
import { tinyAvaModelStore } from './tinyAvaModelStore';
import {
  ensureTinyAvaModelsCached,
  TinyAvaDownloadProgress,
} from './tinyAvaModelCache';
import {
  TINY_AVA_SAMPLE_RATE,
  TINY_AVA_MODEL_VOICES,
  TINY_AVA_SYMBOL_TO_ID,
  TINY_AVA_PHONE_SET,
  TINY_AVA_PARISA_46_SYMBOLS,
  TINY_AVA_PARISA_SYMBOL_TO_ID,
  TINY_AVA_PARISA_PHONE_SET,
  TinyAvaModelMetadata,
  byt5Encode,
  byt5Decode,
  parseEnglishLexicon,
  splitTinyAvaSentences,
  phonemizeTinyAvaSentence,
  limitPeak,
  mapTinyAvaVoiceToId,
  pitchRatioToSemitones,
  validateTinyAvaMetadata,
} from './tinyAvaFrontend';
import {
  extractPiperAudioSamples,
  encodePcmWav,
  playAudioBlob,
  playPcmFloat32WebAudio,
  AudioPlaybackHandle,
} from './audioUtils';

const DEFAULT_G2P_MAX_LEN = 256;
const DEFAULT_PITCH_RANGE = 1.05;
const INTER_SENTENCE_GAP_SEC = 0.1;

export interface TinyAvaDirectResult {
  success: boolean;
  engineUsed: 'tiny-ava';
  wavBlob?: Blob;
  pcmSamples?: Float32Array;
  durationMs?: number;
  sampleRate?: number;
  error?: string;
  errorCategory?: PiperErrorCategory;
}

export interface TinyAvaUtteranceChunk {
  sentence: string;
  index: number;
  total: number;
  pcm: Float32Array;
  sampleRate: number;
  durationMs: number;
}

export interface TinyAvaInitOptions {
  voice?: TinyAvaVoiceId;
  onDownloadProgress?: (progress: TinyAvaDownloadProgress) => void;
  signal?: AbortSignal;
}

function broadcastDownloadProgress(progress: TinyAvaDownloadProgress): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          target: 'TTS_CLIENT',
          action: 'DOWNLOAD_PROGRESS',
          type: 'DOWNLOAD_PROGRESS',
          engine: 'tiny-ava',
          file: progress.file,
          fileLoadedBytes: progress.fileLoadedBytes,
          fileTotalBytes: progress.fileTotalBytes,
          totalLoadedBytes: progress.totalLoadedBytes,
          totalExpectedBytes: progress.totalExpectedBytes,
          percent: progress.percent,
          cached: progress.cached,
        },
        () => {
          if (chrome.runtime.lastError) {
            // No active listener; safe to ignore
          }
        }
      );
    }
  } catch {
    // Non-extension context
  }
}

export class TinyAvaEngine implements TtsEngine {
  public readonly name = 'tiny-ava (ONNX Web 24kHz)';
  public readonly engineType = 'tiny-ava' as const;

  private g2pEncSession: any = null;
  private g2pDecSession: any = null;
  private ttsSession: any = null;
  private loadedModelVariant: 'parisa' | 'v2' | null = null;
  private enLexicon: Map<string, string> | null = null;
  private metadata: TinyAvaModelMetadata | null = null;
  private symbolToId: Record<string, number> = TINY_AVA_PARISA_SYMBOL_TO_ID;
  private phoneSet: Set<string> = new Set(TINY_AVA_PARISA_PHONE_SET);
  private sampleRate: number = TINY_AVA_SAMPLE_RATE;

  private initPromise: Promise<boolean> | null = null;
  private lastInitError: { message: string; category?: PiperErrorCategory } | null = null;
  private isCurrentlySpeaking = false;
  private currentPlaybackHandle: AudioPlaybackHandle | null = null;
  private activeAbortController: AbortController | null = null;
  private activeSynthGeneration = 0;
  private defaultVoice: TinyAvaVoiceId = 'parisa';
  private downloadProgressListeners = new Set<(progress: TinyAvaDownloadProgress) => void>();

  // Test injection hooks
  private _testOrtOverride?: any;
  private _testCacheStorageOverride?: CacheStorage;
  private _testFetchOverride?: typeof fetch;
  private _testAudioContextOverride?: AudioContext;

  public getDefaultVoice(): TinyAvaVoiceId {
    return this.defaultVoice;
  }

  public setDefaultVoice(voice: TinyAvaVoiceId): void {
    this.defaultVoice = voice;
  }

  public getSampleRate(): number {
    return this.sampleRate;
  }

  public onDownloadProgress(cb: (progress: TinyAvaDownloadProgress) => void): () => void {
    this.downloadProgressListeners.add(cb);
    return () => this.downloadProgressListeners.delete(cb);
  }

  /**
   * Inject mock ONNX sessions, CacheStorage, fetch, or AudioContext for deterministic unit tests.
   */
  public setSessionsForTesting(params: {
    g2pEncSession?: any;
    g2pDecSession?: any;
    ttsSession?: any;
    enLexicon?: Map<string, string>;
    metadata?: TinyAvaModelMetadata;
    modelVariant?: 'parisa' | 'v2';
    ortOverride?: any;
    cacheStorageOverride?: CacheStorage;
    fetchOverride?: typeof fetch;
    audioContextOverride?: AudioContext;
  }): void {
    if (params.g2pEncSession !== undefined) this.g2pEncSession = params.g2pEncSession;
    if (params.g2pDecSession !== undefined) this.g2pDecSession = params.g2pDecSession;
    if (params.ttsSession !== undefined) this.ttsSession = params.ttsSession;
    if (params.enLexicon !== undefined) {
      this.enLexicon = params.enLexicon;
    } else if (this.g2pEncSession && this.g2pDecSession && this.ttsSession && !this.enLexicon) {
      this.enLexicon = new Map();
    }
    if (params.metadata) {
      this.applyMetadata(params.metadata);
    } else if (params.modelVariant === 'parisa') {
      this.symbolToId = TINY_AVA_PARISA_SYMBOL_TO_ID;
      this.phoneSet = new Set(TINY_AVA_PARISA_PHONE_SET);
      this.loadedModelVariant = 'parisa';
    } else if (this.g2pEncSession && this.g2pDecSession && this.ttsSession) {
      this.symbolToId = TINY_AVA_SYMBOL_TO_ID;
      this.phoneSet = new Set(TINY_AVA_PHONE_SET);
      this.loadedModelVariant = params.modelVariant ?? 'v2';
    }
    if (params.ortOverride !== undefined) this._testOrtOverride = params.ortOverride;
    if (params.cacheStorageOverride !== undefined) this._testCacheStorageOverride = params.cacheStorageOverride;
    if (params.fetchOverride !== undefined) this._testFetchOverride = params.fetchOverride;
    if (params.audioContextOverride !== undefined) this._testAudioContextOverride = params.audioContextOverride;
  }

  public resetForTesting(): void {
    this.abort();
    this.g2pEncSession = null;
    this.g2pDecSession = null;
    this.ttsSession = null;
    this.loadedModelVariant = null;
    this.enLexicon = null;
    this.metadata = null;
    this.symbolToId = TINY_AVA_PARISA_SYMBOL_TO_ID;
    this.phoneSet = new Set(TINY_AVA_PARISA_PHONE_SET);
    this.sampleRate = TINY_AVA_SAMPLE_RATE;
    this.initPromise = null;
    this.lastInitError = null;
    this.defaultVoice = 'parisa';
    this.downloadProgressListeners.clear();
    this._testOrtOverride = undefined;
    this._testCacheStorageOverride = undefined;
    this._testFetchOverride = undefined;
    this._testAudioContextOverride = undefined;
  }

  private applyMetadata(meta: TinyAvaModelMetadata): void {
    this.metadata = meta;
    this.sampleRate = meta.sample_rate || TINY_AVA_SAMPLE_RATE;
    if (Array.isArray(meta.symbols) && meta.symbols.length > 17) {
      this.symbolToId = Object.fromEntries(meta.symbols.map((s, i) => [s, i]));
      this.phoneSet = new Set(meta.symbols.slice(17));
    }
  }

  public async initialize(): Promise<void> {
    await this.init();
  }

  public isModelReady(voice?: TinyAvaVoiceId): boolean {
    if (!this.g2pEncSession || !this.g2pDecSession || !this.ttsSession) {
      return false;
    }
    const targetVoice = voice || this.defaultVoice || 'parisa';
    // Multi-voice Mana/Maya require v2 model; Parisa works with either parisa-46 or v2-84.
    if (targetVoice !== 'parisa' && this.loadedModelVariant === 'parisa') {
      return false;
    }
    return true;
  }

  private emitProgress(progress: TinyAvaDownloadProgress, localCb?: (p: TinyAvaDownloadProgress) => void): void {
    localCb?.(progress);
    this.downloadProgressListeners.forEach((fn) => {
      try { fn(progress); } catch {}
    });
    broadcastDownloadProgress(progress);
  }

  /**
   * Lazy-loads the three `ort.InferenceSession` instances (`g2p_encoder`, `g2p_decoder`,
   * and selected voice model) from Cache API (`tiny-ava-models-v1`) or IndexedDB cache,
   * configuring `onnxruntime-web` before creating sessions.
   */
  public init(options: TinyAvaInitOptions = {}): Promise<boolean> {
    const requestedVoice = options.voice || this.defaultVoice || 'parisa';
    if (this.isModelReady(requestedVoice)) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    this.lastInitError = null;
    this.initPromise = (async (): Promise<boolean> => {
      try {
        // 1. Configure onnxruntime-web BEFORE creating any sessions
        const ort = this._testOrtOverride || (await getOrt());
        if (!ort || !ort.InferenceSession) {
          this.lastInitError = {
            message: 'model initialization failed: ONNX Runtime Web unavailable in environment',
            category: 'INIT_FAILED',
          };
          return false;
        }

        const sessionOptions = {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        };

        const needsMultiVoice = requestedVoice !== 'parisa';
        let g2pEncoderBytes: ArrayBuffer | null = null;
        let g2pDecoderBytes: ArrayBuffer | null = null;
        let ttsModelBytes: ArrayBuffer | null = null;
        let enLexiconText = '';
        let metadata: TinyAvaModelMetadata | null = null;
        let targetVariant: 'parisa' | 'v2' = needsMultiVoice ? 'v2' : 'parisa';

        // 2. Fast-path: check if unified v2 bundle is already cached in IndexedDB
        if (!this._testCacheStorageOverride) {
          const idbAssets = await tinyAvaModelStore.getAssets();
          if (idbAssets) {
            g2pEncoderBytes = idbAssets.g2pEncoderBytes;
            g2pDecoderBytes = idbAssets.g2pDecoderBytes;
            ttsModelBytes = idbAssets.ttsModelBytes;
            enLexiconText = idbAssets.enLexiconText;
            metadata = idbAssets.metadata;
            targetVariant = 'v2';
          }
        }

        // 3. Canonical lazy-load path via Browser Cache API (`tiny-ava-models-v1`)
        if (!ttsModelBytes) {
          const hasCacheApi = Boolean(
            this._testCacheStorageOverride ||
              (typeof caches !== 'undefined' && typeof caches.open === 'function')
          );

          if (!hasCacheApi) {
            this.lastInitError = {
              message: 'tiny-ava model bundle not cached and Cache API unavailable',
              category: 'STORAGE_FAILED',
            };
            return false;
          }

          const cachedFiles = await ensureTinyAvaModelsCached({
            voice: requestedVoice,
            signal: options.signal,
            cacheStorage: this._testCacheStorageOverride,
            fetchImpl: this._testFetchOverride,
            onProgress: (progress) => this.emitProgress(progress, options.onDownloadProgress),
          });

          g2pEncoderBytes = cachedFiles['g2p_encoder.onnx'] ?? null;
          g2pDecoderBytes = cachedFiles['g2p_decoder.onnx'] ?? null;

          if (needsMultiVoice && cachedFiles['tiny-ava-v2.onnx'] && cachedFiles['tiny-ava-v2.json']) {
            ttsModelBytes = cachedFiles['tiny-ava-v2.onnx'];
            const metaText = new TextDecoder('utf-8').decode(new Uint8Array(cachedFiles['tiny-ava-v2.json']));
            const check = validateTinyAvaMetadata(metaText);
            if (!check.valid || !check.metadata) {
              throw new Error(check.error || 'Invalid tiny-ava-v2.json metadata');
            }
            metadata = check.metadata;
            enLexiconText = cachedFiles['lexicon_en.tsv']
              ? new TextDecoder('utf-8').decode(new Uint8Array(cachedFiles['lexicon_en.tsv']))
              : '';
            targetVariant = 'v2';
          } else if (cachedFiles['tiny-ava-parisa.onnx'] && cachedFiles['tiny-ava-parisa.json']) {
            ttsModelBytes = cachedFiles['tiny-ava-parisa.onnx'];
            const metaText = new TextDecoder('utf-8').decode(new Uint8Array(cachedFiles['tiny-ava-parisa.json']));
            const check = validateTinyAvaMetadata(metaText);
            if (!check.valid || !check.metadata) {
              throw new Error(check.error || 'Invalid tiny-ava-parisa.json metadata');
            }
            metadata = check.metadata;
            targetVariant = 'parisa';
          }
        }

        if (!g2pEncoderBytes || !g2pDecoderBytes || !ttsModelBytes || !metadata) {
          this.lastInitError = {
            message: 'tiny-ava model artifacts incomplete after cache load',
            category: 'PARSE_FAILED',
          };
          return false;
        }

        this.applyMetadata(metadata);
        this.enLexicon = parseEnglishLexicon(enLexiconText);

        // Reuse existing G2P sessions if switching voice variant from parisa -> v2
        if (!this.g2pEncSession) {
          this.g2pEncSession = await ort.InferenceSession.create(
            new Uint8Array(g2pEncoderBytes),
            sessionOptions
          );
        }
        if (!this.g2pDecSession) {
          this.g2pDecSession = await ort.InferenceSession.create(
            new Uint8Array(g2pDecoderBytes),
            sessionOptions
          );
        }
        if (this.ttsSession && typeof this.ttsSession.release === 'function') {
          try { await this.ttsSession.release(); } catch {}
        }
        this.ttsSession = await ort.InferenceSession.create(
          new Uint8Array(ttsModelBytes),
          sessionOptions
        );
        this.loadedModelVariant = targetVariant;

        console.log(
          `✓ tiny-ava ONNX sessions initialized (${targetVariant === 'parisa' ? 'Parisa 46-sym' : 'v2 84-sym'}, ${this.sampleRate} Hz)`
        );
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          this.lastInitError = {
            message: 'tiny-ava download cancelled',
            category: 'DOWNLOAD_FAILED',
          };
          return false;
        }
        const rawMsg = String(err?.message || err || 'ONNX session creation error');
        const lower = rawMsg.toLowerCase();
        const isOffline =
          (typeof navigator !== 'undefined' && navigator.onLine === false) ||
          lower.includes('failed to fetch') ||
          lower.includes('networkerror') ||
          lower.includes('network error') ||
          lower.includes('offline');
        const isOom =
          lower.includes('out of memory') ||
          lower.includes('oom') ||
          lower.includes('memory access out of bounds') ||
          lower.includes('could not allocate');
        const isWasm =
          lower.includes('wasm') ||
          lower.includes('webassembly') ||
          lower.includes('compile');

        const friendlyMsg = isOffline
          ? 'offline before first model cache download'
          : isOom
            ? 'insufficient memory (WASM OOM) while loading tiny-ava'
            : isWasm
              ? `WASM runtime error: ${rawMsg}`
              : `model initialization failed: ${rawMsg}`;

        console.warn('Could not initialize tiny-ava ONNX sessions, fallback available:', err);
        this.releaseSessionsOnly();
        this.lastInitError = {
          message: friendlyMsg,
          category: isOffline ? 'DOWNLOAD_FAILED' : 'INIT_FAILED',
        };
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Runs persian-g2p-tiny autoregressive ByT5 UTF-8 byte encoder+decoder on a single Persian span.
   */
  private async runFaG2P(
    clause: string,
    ort: any,
    synthGen: number,
    maxLen: number = DEFAULT_G2P_MAX_LEN
  ): Promise<string> {
    const inIds = byt5Encode(clause);
    const srcLen = inIds.length;
    const attn = new BigInt64Array(srcLen).fill(1n);

    const encOut = await this.g2pEncSession.run({
      input_ids: new ort.Tensor('int64', inIds, [1, srcLen]),
      attention_mask: new ort.Tensor('int64', attn, [1, srcLen]),
    });

    if (this.activeSynthGeneration !== synthGen) {
      return '';
    }

    const encHidden = encOut.encoder_hidden_states;
    const attnTensor = new ort.Tensor('int64', attn, [1, srcLen]);
    const decIds: number[] = [0];

    for (let step = 0; step < maxLen; step++) {
      if (this.activeSynthGeneration !== synthGen) {
        return '';
      }

      const dTensor = new ort.Tensor(
        'int64',
        BigInt64Array.from(decIds.map(BigInt)),
        [1, decIds.length]
      );
      const decOut = await this.g2pDecSession.run({
        decoder_input_ids: dTensor,
        encoder_hidden_states: encHidden,
        encoder_attention_mask: attnTensor,
      });

      const logits = decOut.logits.data;
      const vocab = decOut.logits.dims[2];
      const off = (decIds.length - 1) * vocab;
      let bestId = 0;
      let bestVal = -Infinity;
      for (let v = 0; v < vocab; v++) {
        if (logits[off + v] > bestVal) {
          bestVal = logits[off + v];
          bestId = v;
        }
      }

      if (bestId === 1) break;
      decIds.push(bestId);
    }

    return byt5Decode(decIds.slice(1));
  }

  /**
   * Synthesizes a single sentence into a peak-normalized 24 kHz mono `Float32Array`.
   */
  public async synthesizeSentenceWave(
    sentence: string,
    options: FarsiTtsOptions = {},
    synthGenOverride?: number
  ): Promise<Float32Array | null> {
    const voiceChoice: TinyAvaVoiceId = options.voice || this.defaultVoice || 'parisa';
    const isReady = await this.init({
      voice: voiceChoice,
      onDownloadProgress: options.onDownloadProgress
        ? (p) => options.onDownloadProgress?.(p)
        : undefined,
      signal: this.activeAbortController?.signal,
    });
    if (!isReady || !this.isModelReady(voiceChoice)) {
      return null;
    }

    const ort = this._testOrtOverride || (await getOrt());
    if (!ort || !ort.Tensor) {
      return null;
    }

    const synthGen = synthGenOverride ?? this.activeSynthGeneration;
    if (this.activeSynthGeneration !== synthGen) {
      return null;
    }

    const modelVoices =
      this.metadata?.voices ||
      (this.loadedModelVariant === 'parisa' ? ['parisa'] : TINY_AVA_MODEL_VOICES);
    const voiceId = BigInt(mapTinyAvaVoiceToId(voiceChoice, modelVoices));
    const speed = Math.max(0.5, Math.min(2.0, options.speed ?? 1.0));
    const pitchShift = pitchRatioToSemitones(options.pitch ?? 1.0);
    const maxTokens = this.metadata?.max_tokens ?? 512;

    const tokenized = await phonemizeTinyAvaSentence(
      sentence,
      (span) => this.runFaG2P(span, ort, synthGen),
      this.enLexicon || new Map(),
      this.symbolToId,
      this.phoneSet,
      maxTokens
    );

    if (this.activeSynthGeneration !== synthGen) {
      return null;
    }

    if (!tokenized || tokenized.ids.length <= 2) {
      return new Float32Array(0);
    }

    const n = tokenized.ids.length;
    const out = await this.ttsSession.run({
      tokens: new ort.Tensor('int64', BigInt64Array.from(tokenized.ids.map(BigInt)), [1, n]),
      stress: new ort.Tensor('int64', BigInt64Array.from(tokenized.stress.map(BigInt)), [1, n]),
      voice: new ort.Tensor('int64', BigInt64Array.from([voiceId]), [1]),
      speed: new ort.Tensor('float32', Float32Array.from([speed]), [1]),
      pitch_shift: new ort.Tensor('float32', Float32Array.from([pitchShift]), [1]),
      pitch_range: new ort.Tensor('float32', Float32Array.from([DEFAULT_PITCH_RANGE]), [1]),
    });

    if (this.activeSynthGeneration !== synthGen) {
      return null;
    }

    const rawAudio = out.audio || (this.ttsSession.outputNames && out[this.ttsSession.outputNames[0]]);
    if (!rawAudio) {
      throw new Error('tiny-ava inference returned empty audio output tensor');
    }

    const samples = Float32Array.from(extractPiperAudioSamples(rawAudio));
    return limitPeak(samples);
  }

  /**
   * Sentence-by-sentence (utterance-level) async generator yielding 24 kHz mono
   * peak-normalized `Float32Array` waveforms. Immediately terminates when `stop()` or
   * `abort()` is invoked so queued sentences are never synthesized.
   */
  public async *synthesizeUtterances(
    text: string,
    options: FarsiTtsOptions = {}
  ): AsyncGenerator<TinyAvaUtteranceChunk, void, unknown> {
    const voiceChoice: TinyAvaVoiceId = options.voice || this.defaultVoice || 'parisa';
    const synthGen = ++this.activeSynthGeneration;
    this.activeAbortController = new AbortController();

    const isReady = await this.init({
      voice: voiceChoice,
      onDownloadProgress: options.onDownloadProgress
        ? (p) => options.onDownloadProgress?.(p)
        : undefined,
      signal: this.activeAbortController.signal,
    });

    if (!isReady || !this.isModelReady(voiceChoice) || this.activeSynthGeneration !== synthGen) {
      return;
    }

    const sentences = splitTinyAvaSentences(text);
    for (let i = 0; i < sentences.length; i++) {
      if (this.activeSynthGeneration !== synthGen) {
        return;
      }
      const pcm = await this.synthesizeSentenceWave(sentences[i], options, synthGen);
      if (this.activeSynthGeneration !== synthGen || !pcm) {
        return;
      }
      if (pcm.length === 0) {
        continue;
      }
      yield {
        sentence: sentences[i],
        index: i,
        total: sentences.length,
        pcm,
        sampleRate: this.sampleRate,
        durationMs: Math.round((pcm.length / this.sampleRate) * 1000),
      };
    }
  }

  /**
   * Direct tiny-ava ONNX synthesis without fallback invocation (returns combined 24 kHz WAV).
   */
  public async synthesizeDirect(
    text: string,
    options: FarsiTtsOptions = {}
  ): Promise<TinyAvaDirectResult> {
    const voiceChoice: TinyAvaVoiceId = options.voice || this.defaultVoice || 'parisa';
    const synthGen = ++this.activeSynthGeneration;
    this.activeAbortController = new AbortController();

    const isReady = await this.init({
      voice: voiceChoice,
      onDownloadProgress: options.onDownloadProgress
        ? (p) => options.onDownloadProgress?.(p)
        : undefined,
      signal: this.activeAbortController.signal,
    });
    if (!isReady || !this.isModelReady(voiceChoice)) {
      return {
        success: false,
        engineUsed: 'tiny-ava',
        error: this.lastInitError?.message || 'tiny-ava model bundle not cached',
        errorCategory: this.lastInitError?.category || 'INIT_FAILED',
      };
    }

    try {
      const sentences = splitTinyAvaSentences(text);
      if (sentences.length === 0) {
        const emptyPcm = new Float32Array(0);
        return {
          success: true,
          engineUsed: 'tiny-ava',
          wavBlob: encodePcmWav(emptyPcm, this.sampleRate),
          pcmSamples: emptyPcm,
          durationMs: 0,
          sampleRate: this.sampleRate,
        };
      }

      const waves: Float32Array[] = [];

      for (const sentence of sentences) {
        if (this.activeSynthGeneration !== synthGen) {
          return {
            success: false,
            engineUsed: 'tiny-ava',
            error: 'Synthesis cancelled',
          };
        }

        const wave = await this.synthesizeSentenceWave(sentence, options, synthGen);
        if (this.activeSynthGeneration !== synthGen) {
          return {
            success: false,
            engineUsed: 'tiny-ava',
            error: 'Synthesis cancelled',
          };
        }
        if (wave && wave.length > 0) {
          waves.push(wave);
        }
      }

      if (waves.length === 0) {
        const emptyPcm = new Float32Array(0);
        return {
          success: true,
          engineUsed: 'tiny-ava',
          wavBlob: encodePcmWav(emptyPcm, this.sampleRate),
          pcmSamples: emptyPcm,
          durationMs: 0,
          sampleRate: this.sampleRate,
        };
      }

      const gapSamples = Math.round(this.sampleRate * INTER_SENTENCE_GAP_SEC);
      let totalLen = 0;
      waves.forEach((w, idx) => {
        totalLen += w.length + (idx < waves.length - 1 ? gapSamples : 0);
      });

      const combined = new Float32Array(totalLen);
      let offset = 0;
      waves.forEach((w, idx) => {
        combined.set(w, offset);
        offset += w.length + (idx < waves.length - 1 ? gapSamples : 0);
      });

      const wavBlob = encodePcmWav(combined, this.sampleRate);
      const durationMs = Math.round((combined.length / this.sampleRate) * 1000);

      return {
        success: true,
        engineUsed: 'tiny-ava',
        wavBlob,
        pcmSamples: combined,
        durationMs,
        sampleRate: this.sampleRate,
      };
    } catch (err: any) {
      console.warn('tiny-ava inference error:', err);
      return {
        success: false,
        engineUsed: 'tiny-ava',
        error: `inference failed: ${err?.message || 'tiny-ava inference error'}`,
        errorCategory: 'INFERENCE_FAILED',
      };
    }
  }

  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const directRes = await this.synthesizeDirect(text, options);

    if (directRes.success && directRes.wavBlob) {
      return {
        success: true,
        wavBlob: directRes.wavBlob,
        durationMs: directRes.durationMs ?? 0,
        sampleRate: directRes.sampleRate ?? this.sampleRate,
        engineUsed: 'tiny-ava',
        fallbackTriggered: false,
      };
    }

    return {
      success: false,
      wavBlob: encodePcmWav(new Float32Array(0), this.sampleRate),
      durationMs: 0,
      sampleRate: this.sampleRate,
      engineUsed: 'tiny-ava',
      fallbackTriggered: false,
      error: directRes.error || 'tiny-ava synthesis unavailable or model not cached',
      errorCategory: directRes.errorCategory,
    };
  }

  /**
   * Streams sentence-by-sentence synthesis directly into the 24 kHz Web Audio playback
   * pipeline. Calling `stop()` or `abort()` immediately halts queued sentences and
   * stops the active `AudioBufferSourceNode`.
   */
  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;
    const speakGen = this.activeSynthGeneration + 1;

    try {
      let startedNotified = false;
      let playedAny = false;
      let totalDurationMs = 0;

      for await (const chunk of this.synthesizeUtterances(text, options)) {
        if (this.activeSynthGeneration !== speakGen) {
          this.isCurrentlySpeaking = false;
          return;
        }

        playedAny = true;
        totalDurationMs += chunk.durationMs;

        await new Promise<void>((resolve, reject) => {
          playPcmFloat32WebAudio(chunk.pcm, chunk.sampleRate, {
            volume: options.volume ?? 1.0,
            audioContext: this._testAudioContextOverride,
            onStart: () => {
              if (!startedNotified && this.activeSynthGeneration === speakGen) {
                startedNotified = true;
                options.onStart?.({ durationMs: totalDurationMs });
              }
            },
            onEnd: () => {
              this.currentPlaybackHandle = null;
              resolve();
            },
            onError: (err) => {
              this.currentPlaybackHandle = null;
              reject(err);
            },
          })
            .then((handle) => {
              if (this.activeSynthGeneration !== speakGen) {
                handle.stop();
                resolve();
                return;
              }
              this.currentPlaybackHandle = handle;
            })
            .catch(reject);
        });

        if (this.activeSynthGeneration !== speakGen) {
          this.isCurrentlySpeaking = false;
          return;
        }
      }

      if (this.activeSynthGeneration !== speakGen) {
        this.isCurrentlySpeaking = false;
        return;
      }

      this.isCurrentlySpeaking = false;
      this.currentPlaybackHandle = null;

      if (!playedAny && this.lastInitError) {
        options.onError?.(new Error(this.lastInitError.message));
        return;
      }
      options.onEnd?.();
    } catch (err: any) {
      this.isCurrentlySpeaking = false;
      this.currentPlaybackHandle = null;
      if (this.activeSynthGeneration === speakGen) {
        options.onError?.(err);
      }
      throw err;
    }
  }

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
   * Immediately halts any in-flight downloads, G2P decoding, queued sentence synthesis,
   * and active Web Audio / HTML5 playback, releasing audio references cleanly.
   */
  public stop(): void {
    this.activeSynthGeneration++;
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }
    if (this.currentPlaybackHandle) {
      try {
        this.currentPlaybackHandle.stop();
      } catch {}
      this.currentPlaybackHandle = null;
    }
    this.isCurrentlySpeaking = false;
  }

  /**
   * Explicit cancellation alias matching Web AbortController semantics.
   */
  public abort(): void {
    this.stop();
  }

  private releaseSessionsOnly(): void {
    for (const sess of [this.g2pEncSession, this.g2pDecSession, this.ttsSession]) {
      if (sess && typeof sess.release === 'function') {
        try { sess.release(); } catch {}
      }
    }
    this.g2pEncSession = null;
    this.g2pDecSession = null;
    this.ttsSession = null;
    this.loadedModelVariant = null;
    this.enLexicon = null;
  }

  public dispose(): void {
    this.abort();
    this.releaseSessionsOnly();
    this.downloadProgressListeners.clear();
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }
}

export const TINY_AVA_PARISA_METADATA_SYMBOLS = TINY_AVA_PARISA_46_SYMBOLS;
export const tinyAvaEngine = new TinyAvaEngine();
