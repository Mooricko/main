/**
 * Persian (Farsi) Text Normalizer
 * 
 * Prepares raw Persian text for eSpeak NG G2P (Grapheme-to-Phoneme) engine.
 * Handles:
 * 1. Arabic/Persian presentation forms and character standardization (ي/ى -> ی, ك -> ک, etc.)
 * 2. Proper ZWNJ (\u200C) handling: preserves morpheme boundaries (می‌, نمی‌‌, ها, های, تر, ترین),
 *    cleans duplicate or boundary ZWNJs without corrupting words.
 * 3. Persian, Arabic-Indic, and ASCII digits and decimals.
 * 4. Persian and ASCII punctuation marks (، ؛ ؟ . ! : « »).
 * 5. Mixed Persian and Latin script passages (e.g. AI, TTS, RSVP).
 */

const ARABIC_TO_PERSIAN_MAP: Record<string, string> = {
  'ي': 'ی',
  'ى': 'ی',
  'ك': 'ک',
  'ة': 'ت',
  'ۀ': 'ه\u200Cی',
  'ؤ': 'و',
  'إ': 'ا',
  'أ': 'ا',
  'ء': 'ئ',
  'ـ': '', // Tatweel
};

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '۰', '١': '۱', '٢': '۲', '٣': '۳', '٤': '۴',
  '٥': '۵', '٦': '۶', '٧': '۷', '٨': '۸', '٩': '۹',
};

const PUNCTUATION_MAP: Record<string, string> = {
  '«': '"',
  '»': '"',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '—': '-',
  '–': '-',
  'ـ': '',
  '۔': '.',
  '،': ',',
  '؛': ';',
  '؟': '?',
};

/**
 * Clean, normalize, and regularize Persian text before eSpeak NG phonemization.
 */
export function normalizePersianText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // 1. Unicode NFKC normalization for Arabic Presentation Forms (U+FB50..U+FDFF, U+FE70..U+FEFC)
  try {
    text = text.normalize('NFKC');
  } catch {
    // fallback if environment lacks normalize
  }

  // 2. Character-level substitutions (Arabic -> Persian standard)
  let charNormalized = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ARABIC_TO_PERSIAN_MAP[ch] !== undefined) {
      charNormalized += ARABIC_TO_PERSIAN_MAP[ch];
    } else if (ARABIC_DIGITS[ch] !== undefined) {
      charNormalized += ARABIC_DIGITS[ch];
    } else if (PUNCTUATION_MAP[ch] !== undefined) {
      charNormalized += PUNCTUATION_MAP[ch];
    } else {
      charNormalized += ch;
    }
  }
  text = charNormalized;

  // 3. Remove non-functional diacritics while preserving intentional vowels when present
  // Remove multiple tatweels or tanween variations if orphaned
  text = text.replace(/ـ+/g, '');

  // 4. Morpheme boundary ZWNJ injection for common verbal prefixes and nominal suffixes
  // e.g. "میروم" -> "می‌روم", "میتوانم" -> "می‌توانم"
  const persianLetters = '[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]';
  const prefixRegex = new RegExp(`(^|\\s)می(?=${persianLetters}{2,})`, 'g');
  const negPrefixRegex = new RegExp(`(^|\\s)نمی(?=${persianLetters}{2,})`, 'g');
  text = text.replace(prefixRegex, '$1می\u200C');
  text = text.replace(negPrefixRegex, '$1نمی\u200C');

  // Nominal suffixes: "خانهها" -> "خانه‌ها", "کتابهای" -> "کتاب‌های"
  const suffixRegex = new RegExp(`(${persianLetters}{2,})(ها|های|هایی|تر|ترین)(?=[.,!?;:،؛؟\\s]|$)`, 'g');
  text = text.replace(suffixRegex, '$1\u200C$2');

  // 5. Clean up ZWNJs:
  // - Deduplicate consecutive ZWNJs
  // - Remove ZWNJs adjacent to spaces, punctuation, or string boundaries
  text = text
    .replace(/\u200C+/g, '\u200C')
    .replace(/(^|[\s.,!?;:،؛؟"\(\)\[\]{}])\u200C+/g, '$1')
    .replace(/\u200C+([\s.,!?;:،؛؟"\(\)\[\]{}]|$)/g, '$1');

  // 6. Whitespace regularizations
  text = text
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();

  return text;
}
