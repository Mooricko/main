/**
 * Engine 3: Custom (bring-your-own) TTS endpoint.
 *
 * Lets the user plug in their own TTS model/provider with their own API key.
 * Speaks the de-facto standard OpenAI-compatible `POST {baseUrl}/audio/speech` contract, which is
 * also implemented by Kokoro-FastAPI, openedai-speech, LocalAI, many proxies, etc.
 *
 * Behaviour guarantees:
 *  - No request is made unless the user configured and selected this engine.
 *  - The API key is only ever sent in the Authorization header to the user's configured host.
 *  - Errors are categorised and scrubbed of the key; the manager (not this class) decides on fallback.
 *  - Requests are cancellable (stop()) and time-limited.
 */

import {
  CustomTtsConfig,
  CustomTtsErrorCategory,
  FarsiTtsOptions,
  SynthesisResult,
  TtsEngine,
} from './types';
import { loadCustomTtsConfig, validateCustomTtsConfig } from './customTtsConfig';
import { playAudioBlob, AudioPlaybackHandle, validateWavBuffer } from './audioUtils';
import { normalizePersianText } from './phonemizer/persianNormalizer';

export const CUSTOM_TTS_TIMEOUT_MS = 30_000;
/** OpenAI-style APIs reject inputs above 4096 chars. */
export const CUSTOM_TTS_MAX_CHARS = 4096;

type Fetcher = typeof fetch;

export function buildSpeechUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return /\/audio\/speech$/.test(trimmed) ? trimmed : `${trimmed}/audio/speech`;
}

function scrub(message: string, apiKey: string): string {
  let out = message;
  if (apiKey) out = out.split(apiKey).join('***');
  return out.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer ***').slice(0, 300);
}

export class CustomTtsEngine implements TtsEngine {
  public readonly name = 'Custom TTS (user endpoint)';
  public readonly engineType = 'custom' as const;

  private isCurrentlySpeaking = false;
  private currentPlaybackHandle: AudioPlaybackHandle | null = null;
  private inflight: AbortController | null = null;
  private fetcher: Fetcher | null = null;
  private configOverride: Partial<CustomTtsConfig> | null = null;

  /** Test seam */
  public setFetcherForTesting(f: Fetcher | null): void {
    this.fetcher = f;
  }

  /** Test seam / explicit config (e.g. "Test connection" button before saving) */
  public setConfigOverride(cfg: Partial<CustomTtsConfig> | null): void {
    this.configOverride = cfg;
  }

  public async initialize(): Promise<void> {
    /* stateless: config is read per request so changes apply immediately */
  }

  public async init(): Promise<boolean> {
    const cfg = this.configOverride ?? (await loadCustomTtsConfig());
    return validateCustomTtsConfig(cfg).valid;
  }

  private fail(error: string, errorCategory: CustomTtsErrorCategory): SynthesisResult {
    return {
      success: false,
      wavBlob: new Blob([], { type: 'audio/wav' }),
      durationMs: 0,
      sampleRate: 0,
      engineUsed: 'custom',
      fallbackTriggered: false,
      error,
      errorCategory,
    };
  }

  public async synthesize(text: string, options: FarsiTtsOptions = {}): Promise<SynthesisResult> {
    const stored = this.configOverride ?? (await loadCustomTtsConfig());
    if (!stored) return this.fail('Custom TTS is not configured', 'NOT_CONFIGURED');
    const validation = validateCustomTtsConfig(stored);
    if (validation.valid === false) return this.fail(validation.error, 'INVALID_CONFIG');
    const cfg: CustomTtsConfig = validation.config;

    const input = normalizePersianText(text) || text.trim();
    if (!input) {
      return { ...this.fail('', 'EMPTY_AUDIO'), success: true, error: undefined, errorCategory: undefined };
    }
    if (input.length > CUSTOM_TTS_MAX_CHARS) {
      return this.fail(`Text too long for custom TTS (${input.length} > ${CUSTOM_TTS_MAX_CHARS} chars)`, 'INVALID_CONFIG');
    }

    // Cancel any previous request
    this.inflight?.abort();
    const controller = new AbortController();
    this.inflight = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CUSTOM_TTS_TIMEOUT_MS);

    const speed = Math.max(0.25, Math.min(4.0, options.speed ?? 1.0));
    const doFetch: Fetcher = this.fetcher ?? ((input: any, init?: any) => fetch(input, init));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

      let res: Response;
      try {
        res = await doFetch(buildSpeechUrl(cfg.baseUrl), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: cfg.model,
            voice: cfg.voice,
            input,
            speed,
            response_format: cfg.format,
          }),
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
      } catch (netErr: any) {
        if (timedOut) return this.fail(`Custom TTS request timed out after ${CUSTOM_TTS_TIMEOUT_MS / 1000}s`, 'TIMEOUT');
        if (controller.signal.aborted) return this.fail('Custom TTS request cancelled', 'NETWORK_ERROR');
        return this.fail(`Custom TTS network error: ${scrub(String(netErr?.message || netErr), cfg.apiKey)}`, 'NETWORK_ERROR');
      }

      if (!res.ok) {
        let detail = '';
        try {
          detail = scrub((await res.text()).replace(/\s+/g, ' ').trim(), cfg.apiKey);
        } catch {}
        if (res.status === 401 || res.status === 403) {
          return this.fail(`Custom TTS rejected the API key (HTTP ${res.status})${detail ? `: ${detail}` : ''}`, 'AUTH_FAILED');
        }
        if (res.status === 429) {
          return this.fail(`Custom TTS rate limit hit (HTTP 429)${detail ? `: ${detail}` : ''}`, 'RATE_LIMITED');
        }
        return this.fail(`Custom TTS HTTP ${res.status}${detail ? `: ${detail}` : ''}`, 'HTTP_ERROR');
      }

      const buf = await res.arrayBuffer();
      if (buf.byteLength < 44) {
        return this.fail('Custom TTS returned no audio data', 'EMPTY_AUDIO');
      }

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('json') || ct.startsWith('text/')) {
        return this.fail('Custom TTS returned a non-audio response (check model/voice/base URL)', 'EMPTY_AUDIO');
      }

      const wav = validateWavBuffer(buf);
      const mime = wav.valid ? 'audio/wav' : cfg.format === 'wav' ? 'audio/wav' : 'audio/mpeg';
      const sampleRate = wav.valid ? wav.sampleRate ?? 0 : 0;
      const durationMs =
        wav.valid && wav.sampleRate && wav.bitsPerSample && wav.numChannels && wav.dataByteLength
          ? Math.round((wav.dataByteLength / (wav.sampleRate * wav.numChannels * (wav.bitsPerSample / 8))) * 1000)
          : 0;

      return {
        success: true,
        wavBlob: new Blob([buf], { type: mime }),
        durationMs,
        sampleRate,
        engineUsed: 'custom',
        fallbackTriggered: false,
      };
    } finally {
      clearTimeout(timer);
      if (this.inflight === controller) this.inflight = null;
    }
  }

  public async speak(text: string, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;
    try {
      const res = await this.synthesize(text, options);
      if (!res.success) {
        this.isCurrentlySpeaking = false;
        options.onError?.(new Error(res.error || 'Custom TTS failed'));
        return;
      }
      await this.playWavBlob(res.wavBlob, options);
    } catch (err: any) {
      this.isCurrentlySpeaking = false;
      options.onError?.(err);
    }
  }

  public async playWavBlob(blob: Blob, options: FarsiTtsOptions = {}): Promise<void> {
    this.stop();
    this.isCurrentlySpeaking = true;
    this.currentPlaybackHandle = await playAudioBlob(blob, {
      volume: options.volume ?? 1.0,
      onStart: () => options.onStart?.(),
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
    this.inflight?.abort();
    this.inflight = null;
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
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }
}

export const customTtsEngine = new CustomTtsEngine();
