/**
 * Types and interfaces for Dual-Engine Offline Farsi Text-To-Speech
 * (Piper ONNX & eSpeak NG WASM)
 */

export type FarsiTtsEngineType = 'espeak' | 'piper';

export type TtsLifecycleState =
  | 'IDLE'
  | 'STARTED'
  | 'PLAYING'
  | 'ENDED'
  | 'STOPPED'
  | 'ERROR';

export type PiperErrorCategory =
  | 'DOWNLOAD_FAILED'
  | 'PARSE_FAILED'
  | 'STORAGE_FAILED'
  | 'INIT_FAILED'
  | 'INFERENCE_FAILED';

export interface FarsiTtsOptions {
  engine?: FarsiTtsEngineType;
  speed?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0.6 to 1.4 (default 1.0)
  volume?: number; // 0.0 to 1.0 (default 1.0)
  allowFallback?: boolean; // whether to invoke fallback on failure (default true)
  playbackId?: number; // internal utterance id to prevent stale event collisions
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
  onFallback?: (reason: string) => void;
}

export type PiperModelStatus = 'not_cached' | 'downloading' | 'ready' | 'error';

export interface PiperCacheInfo {
  status: PiperModelStatus;
  modelName: string;
  sizeBytes: number;
  downloadProgress: number; // 0 to 100
  lastUpdated?: number;
  errorMessage?: string;
  errorCategory?: PiperErrorCategory;
  cacheVersion?: string;
  isOfflineReady: boolean;
}

export interface SynthesisResult {
  success: boolean;
  wavBlob: Blob;
  audioBuffer?: AudioBuffer;
  durationMs: number;
  sampleRate: number;
  engineUsed: FarsiTtsEngineType;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  error?: string;
  errorCategory?: PiperErrorCategory;
}

export type TtsResult = SynthesisResult;

export interface PiperDirectResult {
  success: boolean;
  engineUsed: 'piper';
  wavBlob?: Blob;
  durationMs?: number;
  sampleRate?: number;
  error?: string;
  errorCategory?: PiperErrorCategory;
}

/**
 * Standard TTS Engine interface
 */
export interface TtsEngine {
  readonly name: string;
  readonly engineType: FarsiTtsEngineType;
  initialize(): Promise<void>;
  init(): Promise<boolean>; // alias for initialize
  synthesize(text: string, options?: FarsiTtsOptions): Promise<SynthesisResult>;
  speak(text: string, options?: FarsiTtsOptions): Promise<void>;
  stop(): void;
  dispose(): void;
  isSpeaking(): boolean;
}

export type TtsEngineInterface = TtsEngine;

/**
 * Real eSpeak NG Farsi interface separating G2P phonemization from speech synthesis
 */
export interface FarsiEspeak {
  phonemize(text: string): Promise<string>;
  synthesize(text: string, options?: FarsiTtsOptions): Promise<SynthesisResult>;
}

/**
 * Standardized Unified Extension Message Types
 * Canonical message identifier for status is 'GET_STATUS' (with legacy fallback support)
 */
export type TtsActionType =
  | 'SPEAK'
  | 'STOP'
  | 'GET_STATUS'
  | 'SET_ENGINE'
  | 'STATUS_CHANGED'
  | 'DOWNLOAD_PIPER'
  | 'CLEAR_PIPER_CACHE';

export interface TtsMessageBase {
  type?: TtsActionType | string;
  action?: TtsActionType | string;
  target?: string;
}

export interface TtsSpeakMessage extends TtsMessageBase {
  type?: 'SPEAK';
  action?: 'SPEAK';
  text: string;
  engine?: FarsiTtsEngineType;
  speed?: number;
  pitch?: number;
  volume?: number;
  allowFallback?: boolean;
  playbackId?: number;
}

export interface TtsStopMessage extends TtsMessageBase {
  type?: 'STOP';
  action?: 'STOP';
  playbackId?: number;
}

export interface TtsGetStatusMessage extends TtsMessageBase {
  type?: 'GET_STATUS';
  action?: 'GET_STATUS';
}

export interface TtsSetEngineMessage extends TtsMessageBase {
  type?: 'SET_ENGINE';
  action?: 'SET_ENGINE';
  engine: FarsiTtsEngineType;
}

export interface TtsStatusChangedMessage extends TtsMessageBase {
  type?: 'STATUS_CHANGED';
  action?: 'STATUS_CHANGED';
  state: TtsLifecycleState;
  playbackId?: number;
  engineUsed?: FarsiTtsEngineType;
  durationMs?: number;
  error?: string;
}

export type TtsMessage =
  | TtsSpeakMessage
  | TtsStopMessage
  | TtsGetStatusMessage
  | TtsSetEngineMessage
  | TtsStatusChangedMessage;

export interface OffscreenTtsMessage extends TtsMessageBase {
  action?: TtsActionType | string;
  text?: string;
  engine?: FarsiTtsEngineType;
  speed?: number;
  pitch?: number;
  volume?: number;
  allowFallback?: boolean;
  playbackId?: number;
}

export interface OffscreenTtsResponse {
  success: boolean;
  engineUsed?: FarsiTtsEngineType;
  durationMs?: number;
  error?: string;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  status?: {
    isSpeaking: boolean;
    state?: TtsLifecycleState;
    activeEngine: FarsiTtsEngineType;
    offscreenReady: boolean;
    piperCache?: PiperCacheInfo;
  };
}
