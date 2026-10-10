/**
 * Validation utilities for Piper Farsi ONNX models and configurations
 * 
 * Enforces:
 * - Model exists and non-empty (>5000 bytes)
 * - Config exists, is non-empty, and parses valid JSON
 * - audio.sample_rate exists and is a positive number
 * - phoneme_type exists and is valid
 * - phoneme_id_map exists and contains symbols
 * - voice / language matches the target voice (fa / fa_IR / amir)
 * - Prevents silent substitution of empty config objects ({})
 */

export interface PiperVoiceMetadata {
  name?: string;
  language?: {
    code?: string;
    family?: string;
    region?: string;
    name_native?: string;
  };
  quality?: string;
}

export interface PiperModelConfig {
  audio: {
    sample_rate: number;
    [key: string]: any;
  };
  espeak?: {
    voice?: string;
    [key: string]: any;
  };
  inference?: {
    noise_scale?: number;
    length_scale?: number;
    noise_w?: number;
    [key: string]: any;
  };
  phoneme_type: string;
  phoneme_id_map: Record<string, number | number[]>;
  num_symbols?: number;
  num_speakers?: number;
  speaker_id_map?: Record<string, number>;
  piper_version?: string;
  voice?: PiperVoiceMetadata;
  [key: string]: any;
}

export interface ModelValidationResult {
  valid: boolean;
  error?: string;
  config?: PiperModelConfig;
}

/**
 * Validates raw Piper ONNX model bytes
 */
export function validatePiperModelBytes(bytes: ArrayBuffer | Uint8Array | null | undefined): { valid: boolean; error?: string } {
  if (!bytes) {
    return { valid: false, error: 'Model not found: ONNX bytes are null or undefined' };
  }
  const byteLength = bytes.byteLength;
  if (byteLength < 5000) {
    return {
      valid: false,
      error: `Model file corrupt or incomplete: size is only ${byteLength} bytes (minimum 5KB required)`
    };
  }
  return { valid: true };
}

/**
 * Validates a Piper JSON configuration object or raw string.
 * Never silently substitutes {} on failure.
 */
export function validatePiperModelConfig(
  configInput: string | Record<string, any> | null | undefined,
  expectedVoice: string = 'fa_IR-amir-medium'
): ModelValidationResult {
  if (!configInput) {
    return { valid: false, error: 'Model config not found: configuration is missing' };
  }

  let config: any;
  if (typeof configInput === 'string') {
    const trimmed = configInput.trim();
    if (!trimmed || trimmed === '{}') {
      return { valid: false, error: 'Model config not found: configuration string is empty or blank JSON ({})' };
    }
    try {
      config = JSON.parse(trimmed);
    } catch (parseErr: any) {
      return {
        valid: false,
        error: `Model config invalid: failed to parse JSON (${parseErr?.message || 'syntax error'})`
      };
    }
  } else if (typeof configInput === 'object') {
    config = configInput;
  } else {
    return { valid: false, error: 'Model config invalid: unexpected configuration type' };
  }

  if (!config || typeof config !== 'object' || Object.keys(config).length === 0) {
    return { valid: false, error: 'Model config invalid: empty configuration object ({})' };
  }

  // 1. Validate sample_rate
  const sampleRate = config.audio?.sample_rate;
  if (typeof sampleRate !== 'number' || sampleRate <= 0 || !Number.isFinite(sampleRate)) {
    return {
      valid: false,
      error: 'Model config invalid: audio.sample_rate missing or invalid (expected positive number)'
    };
  }

  // 2. Validate phoneme_type
  if (!config.phoneme_type || typeof config.phoneme_type !== 'string') {
    return {
      valid: false,
      error: 'Model config invalid: phoneme_type missing or invalid (expected string e.g. "espeak" or "text")'
    };
  }

  // 3. Validate phoneme_id_map
  if (!config.phoneme_id_map || typeof config.phoneme_id_map !== 'object' || Object.keys(config.phoneme_id_map).length === 0) {
    return {
      valid: false,
      error: 'Model config invalid: phoneme_id_map missing or empty object'
    };
  }

  // 4. Validate voice/language pairing if voice info is present
  if (config.voice) {
    const voiceName = (config.voice.name || '').toLowerCase();
    const langCode = (config.voice.language?.code || config.voice.language?.family || '').toLowerCase();
    const expectedLower = expectedVoice.toLowerCase();

    // Check if voice config is intended for another voice entirely
    if (expectedLower.includes('fa') || expectedLower.includes('amir')) {
      const isFarsiVoice = langCode.includes('fa') || voiceName.includes('amir') || config.espeak?.voice === 'fa';
      if (!isFarsiVoice && voiceName && !expectedLower.includes(voiceName)) {
        return {
          valid: false,
          error: `Model config voice mismatch: config is for voice "${voiceName}" (${langCode}), expected "${expectedVoice}"`
        };
      }
    }
  }

  return {
    valid: true,
    config: config as PiperModelConfig
  };
}
