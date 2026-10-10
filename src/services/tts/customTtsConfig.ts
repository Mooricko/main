/**
 * Persistence + validation for the user's own ("custom") TTS endpoint.
 *
 * Storage:
 *  - Chrome extension: chrome.storage.local (isolated to the extension, readable by the
 *    offscreen document that actually performs the request).
 *  - Plain web app:    localStorage via safeStorage.
 *
 * Security notes:
 *  - The API key is stored in plain text on the user's own device (like any browser-side
 *    BYO-key app). It is NEVER included in logs, error messages or exported settings.
 *  - Plain http:// is only accepted for loopback / private-network hosts (self-hosted models);
 *    anything else must be https:// so the key is not sent in clear text.
 */

import { CustomTtsConfig } from './types';
import { safeStorage } from '../../utils/safeStorage';

export const CUSTOM_TTS_STORAGE_KEY = 'adhd_reader_farsi_custom_tts_config';

export const DEFAULT_CUSTOM_TTS_CONFIG: CustomTtsConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'tts-1',
  voice: 'alloy',
  format: 'mp3',
};

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.storage?.local;
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1') return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/**
 * Normalizes + validates a user-provided config. Returns a cleaned config or a human readable error.
 * The apiKey may be empty only for private/self-hosted endpoints that don't need auth.
 */
export function validateCustomTtsConfig(
  input: Partial<CustomTtsConfig> | null | undefined
): { valid: true; config: CustomTtsConfig } | { valid: false; error: string } {
  if (!input) return { valid: false, error: 'Custom TTS is not configured' };

  const baseUrl = String(input.baseUrl ?? '').trim().replace(/\/+$/, '');
  const apiKey = String(input.apiKey ?? '').trim();
  const model = String(input.model ?? '').trim();
  const voice = String(input.voice ?? '').trim();
  const format = input.format === 'wav' ? 'wav' : 'mp3';

  if (!baseUrl) return { valid: false, error: 'Base URL is required' };
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { valid: false, error: 'Base URL is not a valid URL' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { valid: false, error: 'Base URL must start with https:// (or http:// for localhost)' };
  }
  if (url.protocol === 'http:' && !isPrivateHost(url.hostname)) {
    return { valid: false, error: 'Plain http:// is only allowed for localhost / private-network servers. Use https://' };
  }
  if (url.username || url.password) {
    return { valid: false, error: 'Do not embed credentials in the URL — use the API key field' };
  }
  if (!apiKey && !isPrivateHost(url.hostname)) {
    return { valid: false, error: 'API key is required for this endpoint' };
  }
  if (/[\r\n]/.test(apiKey)) return { valid: false, error: 'API key contains invalid characters' };
  if (!model) return { valid: false, error: 'Model is required' };
  if (!voice) return { valid: false, error: 'Voice is required' };

  return { valid: true, config: { baseUrl, apiKey, model, voice, format } };
}

export async function loadCustomTtsConfig(): Promise<Partial<CustomTtsConfig> | null> {
  try {
    if (hasChromeStorage()) {
      const res = await chrome.storage.local.get([CUSTOM_TTS_STORAGE_KEY]);
      const stored = res?.[CUSTOM_TTS_STORAGE_KEY];
      return stored && typeof stored === 'object' ? (stored as Partial<CustomTtsConfig>) : null;
    }
    const raw = safeStorage.getItem(CUSTOM_TTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<CustomTtsConfig>) : null;
  } catch {
    return null;
  }
}

/** Validates and persists. Returns the validation result so the UI can show the error. */
export async function saveCustomTtsConfig(
  input: Partial<CustomTtsConfig>
): Promise<{ valid: true; config: CustomTtsConfig } | { valid: false; error: string }> {
  const result = validateCustomTtsConfig(input);
  if (!result.valid) return result;
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [CUSTOM_TTS_STORAGE_KEY]: result.config });
  } else {
    safeStorage.setItem(CUSTOM_TTS_STORAGE_KEY, JSON.stringify(result.config));
  }
  return result;
}

export async function clearCustomTtsConfig(): Promise<void> {
  try {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove([CUSTOM_TTS_STORAGE_KEY]);
    }
    safeStorage.removeItem(CUSTOM_TTS_STORAGE_KEY);
  } catch {
    // best effort
  }
}
