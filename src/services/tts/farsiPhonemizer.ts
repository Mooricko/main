/**
 * Farsi Phonemizer, Normalizer & WAV Audio Encoder
 * 
 * Provides:
 * 1. Persian Unicode text normalization & diacritic processing.
 * 2. Persian phoneme mapping for acoustic and neural synthesis.
 * 3. Piper ONNX token sequence builder (BOS, PAD, EOS, phoneme IDs).
 * 4. High-performance 16-bit PCM WAV container encoding from float arrays.
 */

// Normalized Persian character mappings
const CHAR_NORMALIZATION_MAP: Record<string, string> = {
  'ي': 'ی',
  'ى': 'ی',
  'ك': 'ک',
  'ة': 'ت',
  'ۀ': 'ه',
  'ؤ': 'و',
  'إ': 'ا',
  'أ': 'ا',
  'ء': 'ئ',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  'ـ': '', // remove tatweel
};

/**
 * Clean and normalize Persian text for TTS engines
 */
export function normalizeFarsiText(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // Normalize characters
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    normalized += CHAR_NORMALIZATION_MAP[ch] !== undefined ? CHAR_NORMALIZATION_MAP[ch] : ch;
  }

  // Remove zero-width non-joiner at edges of words, replace multiple spaces
  normalized = normalized
    .replace(/\u200C+/g, '\u200C')
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Phoneme formant profile for Persian sounds (eSpeak NG Farsi formant rules)
 */
export interface PhonemeFormants {
  f1: number; // Hz (mouth opening)
  f2: number; // Hz (tongue position)
  f3: number; // Hz (lip rounding)
  durationScale: number;
  isVoiced: boolean;
  isFricative?: boolean;
  isPlosive?: boolean;
}

export const FARSI_PHONEME_TABLE: Record<string, PhonemeFormants> = {
  // Vowels
  'ا': { f1: 740, f2: 1100, f3: 2500, durationScale: 1.25, isVoiced: true },   // /ɒ/ (آ)
  'آ': { f1: 740, f2: 1100, f3: 2500, durationScale: 1.30, isVoiced: true },   // /ɒ/ (آ)
  'و': { f1: 320, f2: 850,  f3: 2250, durationScale: 1.15, isVoiced: true },   // /u/ or /v/
  'ی': { f1: 290, f2: 2280, f3: 2900, durationScale: 1.15, isVoiced: true },   // /i/ or /j/
  'َ': { f1: 650, f2: 1450, f3: 2450, durationScale: 0.85, isVoiced: true },   // /æ/ (fathe)
  'ِ': { f1: 420, f2: 1950, f3: 2600, durationScale: 0.85, isVoiced: true },   // /e/ (kasre)
  'ُ': { f1: 400, f2: 1000, f3: 2350, durationScale: 0.85, isVoiced: true },   // /o/ (zamme)
  
  // Consonants - Plosives
  'ب': { f1: 450, f2: 1150, f3: 2400, durationScale: 0.9, isVoiced: true, isPlosive: true },
  'پ': { f1: 400, f2: 1100, f3: 2400, durationScale: 0.9, isVoiced: false, isPlosive: true },
  'ت': { f1: 400, f2: 1700, f3: 2600, durationScale: 0.9, isVoiced: false, isPlosive: true },
  'ط': { f1: 400, f2: 1700, f3: 2600, durationScale: 0.9, isVoiced: false, isPlosive: true },
  'د': { f1: 420, f2: 1650, f3: 2600, durationScale: 0.9, isVoiced: true, isPlosive: true },
  'ک': { f1: 380, f2: 1950, f3: 2700, durationScale: 0.9, isVoiced: false, isPlosive: true },
  'گ': { f1: 400, f2: 1900, f3: 2650, durationScale: 0.9, isVoiced: true, isPlosive: true },
  'ق': { f1: 520, f2: 1250, f3: 2400, durationScale: 0.9, isVoiced: true, isPlosive: true },

  // Consonants - Fricatives
  'ف': { f1: 450, f2: 1400, f3: 2500, durationScale: 1.0, isVoiced: false, isFricative: true },
  'س': { f1: 400, f2: 1800, f3: 3200, durationScale: 1.1, isVoiced: false, isFricative: true },
  'ص': { f1: 400, f2: 1800, f3: 3200, durationScale: 1.1, isVoiced: false, isFricative: true },
  'ث': { f1: 400, f2: 1800, f3: 3200, durationScale: 1.1, isVoiced: false, isFricative: true },
  'ز': { f1: 450, f2: 1750, f3: 3000, durationScale: 1.0, isVoiced: true, isFricative: true },
  'ض': { f1: 450, f2: 1750, f3: 3000, durationScale: 1.0, isVoiced: true, isFricative: true },
  'ذ': { f1: 450, f2: 1750, f3: 3000, durationScale: 1.0, isVoiced: true, isFricative: true },
  'ظ': { f1: 450, f2: 1750, f3: 3000, durationScale: 1.0, isVoiced: true, isFricative: true },
  'ش': { f1: 450, f2: 2000, f3: 2800, durationScale: 1.2, isVoiced: false, isFricative: true },
  'ژ': { f1: 450, f2: 1950, f3: 2750, durationScale: 1.1, isVoiced: true, isFricative: true },
  'خ': { f1: 580, f2: 1400, f3: 2400, durationScale: 1.1, isVoiced: false, isFricative: true },
  'غ': { f1: 580, f2: 1350, f3: 2400, durationScale: 1.1, isVoiced: true, isFricative: true },
  'ه': { f1: 550, f2: 1550, f3: 2500, durationScale: 0.9, isVoiced: false, isFricative: true },
  'ح': { f1: 550, f2: 1550, f3: 2500, durationScale: 0.9, isVoiced: false, isFricative: true },

  // Affricates
  'ج': { f1: 460, f2: 1850, f3: 2700, durationScale: 1.0, isVoiced: true },
  'چ': { f1: 420, f2: 1900, f3: 2750, durationScale: 1.0, isVoiced: false },

  // Nasals & Liquids
  'م': { f1: 350, f2: 1100, f3: 2250, durationScale: 1.0, isVoiced: true },
  'ن': { f1: 370, f2: 1600, f3: 2450, durationScale: 1.0, isVoiced: true },
  'ل': { f1: 420, f2: 1350, f3: 2600, durationScale: 0.95, isVoiced: true },
  'ر': { f1: 450, f2: 1450, f3: 2400, durationScale: 0.85, isVoiced: true },
  
  // Neutral / Schwa fallback
  'DEFAULT': { f1: 500, f2: 1500, f3: 2500, durationScale: 1.0, isVoiced: true }
};

/**
 * Standard Piper Farsi Phoneme ID mapping (compatible with fa_IR-amir-medium)
 */
export const DEFAULT_PIPER_FARSI_PHONEME_MAP: Record<string, number> = {
  '_': 0, // pad
  '^': 1, // bos
  '$': 2, // eos
  ' ': 3,
  '!': 4,
  '"': 5,
  '(': 6,
  ')': 7,
  ',': 8,
  '-': 9,
  '.': 10,
  ':': 11,
  ';': 12,
  '?': 13,
  '؟': 14,
  '،': 15,
  'ء': 16,
  'آ': 17,
  'ا': 18,
  'ب': 19,
  'ت': 20,
  'ث': 21,
  'ج': 22,
  'ح': 23,
  'خ': 24,
  'د': 25,
  'ذ': 26,
  'ر': 27,
  'ز': 28,
  'س': 29,
  'ش': 30,
  'ص': 31,
  'ض': 32,
  'ط': 33,
  'ظ': 34,
  'ع': 35,
  'غ': 36,
  'ف': 37,
  'ق': 38,
  'ک': 39,
  'گ': 40,
  'ل': 41,
  'م': 42,
  'ن': 43,
  'و': 44,
  'ه': 45,
  'ی': 46,
  'پ': 47,
  'چ': 48,
  'ژ': 49,
  '۰': 50,
  '۱': 51,
  '۲': 52,
  '۳': 53,
  '۴': 54,
  '۵': 55,
  '۶': 56,
  '۷': 57,
  '۸': 58,
  '۹': 59,
};

/**
 * Converts Farsi text into Piper ONNX model token IDs:
 * Pattern: [BOS, PAD, token1, PAD, token2, PAD, ..., EOS]
 */
export function farsiTextToPiperTokens(
  text: string,
  phonemeIdMap: Record<string, number | number[]> = DEFAULT_PIPER_FARSI_PHONEME_MAP
): number[] {
  const normalized = normalizeFarsiText(text);
  const padId = typeof phonemeIdMap['_'] === 'number' ? (phonemeIdMap['_'] as number) : 0;
  const bosId = typeof phonemeIdMap['^'] === 'number' ? (phonemeIdMap['^'] as number) : 1;
  const eosId = typeof phonemeIdMap['$'] === 'number' ? (phonemeIdMap['$'] as number) : 2;

  const tokenIds: number[] = [bosId];

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    tokenIds.push(padId);

    let id: number | undefined;
    const entry = phonemeIdMap[char];
    if (typeof entry === 'number') {
      id = entry;
    } else if (Array.isArray(entry) && entry.length > 0) {
      id = entry[0];
    } else {
      // Fallback: check lowercase or space
      const spaceEntry = phonemeIdMap[' '];
      id = typeof spaceEntry === 'number' ? spaceEntry : 3;
    }

    if (id !== undefined) {
      tokenIds.push(id);
    }
  }

  tokenIds.push(padId);
  tokenIds.push(eosId);

  return tokenIds;
}

/**
 * Creates a valid RIFF 16-bit PCM WAV Blob from raw float32 samples
 */
export function encodePcmWav(samples: Float32Array, sampleRate: number = 22050): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples (clamped to [-1.0, 1.0] and converted to Int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
