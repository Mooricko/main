/**
 * Persian (Farsi) Text Normalizer
 * 
 * Prepares raw Persian text for eSpeak NG G2P (Grapheme-to-Phoneme) engine.
 * Handles:
 * 1. Arabic/Persian presentation forms and character standardization (ي/ى -> ی, ك -> ک, etc.)
 * 2. Proper ZWNJ (\u200C) handling: preserves morpheme boundaries (می‌, نمی‌, ها, های),
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

  // 4. Morpheme boundary ZWNJ injection for the verbal prefixes می/نمی and the plural suffixes ها/های/هایی.
  // e.g. "میروم" -> "می‌روم", "کتابهای" -> "کتاب‌های".
  // NOTE: the comparative suffixes تر/ترین are intentionally NOT handled: a blind rule corrupts real
  // words (دختر, دکتر, کیلومتر, برادر...). Users who type "بزرگتر" still get correct G2P from eSpeak.
  // "می" is also the start of many nouns (میوه, میز, میدان...), which must stay untouched.
  const persianLetters = '[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]';
  // Only insert ZWNJ after می/نمی when followed by a KNOWN present-tense verb stem. This avoids
  // corrupting the many nouns that start with "می" (میوه, میز, میدان, میراث, میلیون...).
  const miVerbStems = [
    'روم', 'روی', 'رود', 'روند', 'توانم', 'توانی', 'تواند', 'توانند',
    'دانم', 'دانی', 'داند', 'دانند', 'خواهم', 'خواهی', 'خواهد', 'خواهند',
    'گویم', 'گویی', 'گوید', 'گویند', 'بینم', 'بینی', 'بیند', 'بینند',
    'کنم', 'کنی', 'کند', 'کنند', 'شوم', 'شوی', 'شود', 'شوند',
    'آیم', 'آیی', 'آید', 'آیند', 'دهم', 'دهی', 'دهد', 'دهند',
    'باشم', 'باشی', 'باشد', 'باشند', 'گیرم', 'گیری', 'گیرد', 'گیرند',
    'دارم', 'داری', 'دارد', 'دارند',
  ].join('|');
  const prefixRegex = new RegExp(`(^|\\s)(ن?می)(${miVerbStems})(?=$|[\\s.,!?;:،؛؟])`, 'g');
  text = text.replace(prefixRegex, '$1$2\u200C$3');

  // Nominal plural suffixes: "خانهها" -> "خانه‌ها", "کتابهای" -> "کتاب‌های"
  const suffixRegex = new RegExp(`(${persianLetters}{2,})(ها|های|هایی)(?=[.,!?;:،؛؟\\s]|$)`, 'g');
  text = text.replace(suffixRegex, '$1\u200C$2');

  // 5. Clean up ZWNJs:
  // - Deduplicate consecutive ZWNJs
  // - Remove ZWNJs adjacent to spaces, punctuation, or string boundaries
  text = text
    .replace(/\u200C+/g, '\u200C')
    .replace(/(^|[\s.,!?;:،؛؟"\(\)\[\]{}])\u200C+/g, '$1')
    .replace(/\u200C+([\s.,!?;:،؛؟"\(\)\[\]{}]|$)/g, '$1');

  // 5b. Decimal separators between digits are read as "ممیز" (eSpeak otherwise emits junk phoneme digits).
  text = text.replace(/([0-9۰-۹])\.(?=[0-9۰-۹])/g, '$1 ممیز ');

  // 6. Whitespace regularizations
  text = text
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();

  return text;
}

/**
 * Splits normalized text into sentence-sized pieces. Piper is trained per sentence; feeding it a whole
 * paragraph as one sequence degrades prosody and can exceed the model's comfortable length.
 * Keeps the terminator with its sentence. Very long sentences are further split on clause marks.
 */
export function splitIntoSentences(text: string, maxLen: number = 220): string[] {
  if (!text) return [];
  const raw = text.match(/[^.!?؟…]+[.!?؟…]*/g) || [text];
  const out: string[] = [];
  for (const piece of raw) {
    const t = piece.trim();
    if (!t) continue;
    if (t.length <= maxLen) {
      out.push(t);
      continue;
    }
    let buf = '';
    for (const part of t.split(/(?<=[,;:،؛])\s+/)) {
      if (buf && (buf + ' ' + part).length > maxLen) {
        out.push(buf);
        buf = part;
      } else {
        buf = buf ? `${buf} ${part}` : part;
      }
    }
    if (buf) out.push(buf);
  }
  return out;
}
