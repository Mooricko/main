/**
 * Types and interfaces for Dual-Engine Offline Farsi Text-To-Speech
 * (Piper ONNX & eSpeak NG WASM)
 */

export type FarsiTtsEngineType = 'espeak' | 'piper';

export interface FarsiTtsOptions {
  engine?: FarsiTtsEngineType;
  speed?: number; // 0.5 to 2.0 (default 1.0)
  pitch?: number; // 0.6 to 1.4 (default 1.0)
  volume?: number; // 0.0 to 1.0 (default 1.0)
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
  isOfflineReady: boolean;
}

export interface SynthesisResult {
  wavBlob: Blob;
  audioBuffer?: AudioBuffer;
  durationMs: number;
  sampleRate: number;
  engineUsed: FarsiTtsEngineType;
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

export interface TtsEngineInterface {
  readonly name: string;
  readonly engineType: FarsiTtsEngineType;
  init(): Promise<boolean>;
  synthesize(text: string, options?: FarsiTtsOptions): Promise<SynthesisResult>;
  speak(text: string, options?: FarsiTtsOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
}

export interface OffscreenTtsMessage {
  action: 'SPEAK' | 'STOP' | 'SET_ENGINE' | 'GET_STATUS' | 'DOWNLOAD_PIPER' | 'CLEAR_PIPER_CACHE';
  target?: 'OFFSCREEN_TTS';
  text?: string;
  engine?: FarsiTtsEngineType;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface OffscreenTtsResponse {
  success: boolean;
  engineUsed?: FarsiTtsEngineType;
  durationMs?: number;
  error?: string;
  status?: {
    isSpeaking: boolean;
    activeEngine: FarsiTtsEngineType;
    piperCache: PiperCacheInfo;
  };
}
