/**
 * tiny-ava v2 Bilingual (Persian + English) Linguistic Frontend
 *
 * Ports the canonical browser frontend from mallahyari/tiny-ava (Apache-2.0)
 * while integrating our safe Persian ZWNJ and decimal handling without breaking
 * persian-g2p-tiny's training distribution.
 *
 * Key differences from persianNormalizer.ts (eSpeak/Piper):
 * - Preserves short vowel diacritics (fatha \u064e, kasra \u0650, damma \u064f) and shadda (\u0651)
 *   for homograph & ezafe overrides while stripping tanween/sukun/superscript alef.
 * - Maps Arabic ة/ۀ -> ه (not ت) and ٱ -> ا to match persian-g2p-tiny training data.
 * - Preserves em-dash (—) and ellipsis (…) required by tiny-ava-v2.json SYMBOLS.
 * - Uses ASCII punctuation (, . ? ! ; : " ' ( ) — …) matching tiny-ava-v2.json.
 */

import { TinyAvaVoiceId } from './types';

export const TINY_AVA_SAMPLE_RATE = 24000;
export const TINY_AVA_PEAK_LIMIT = 0.99;

/**
 * Exact 84-symbol unified FA + EN table matching tiny-ava-v2.json
 */
export const TINY_AVA_V2_SYMBOLS: readonly string[] = [
  '<pad>', '<bos>', '<eos>', '<sp>', '<unk>',
  ',', '.', '?', '!', ';', ':', '"', "'", '(', ')', '—', '…',
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h',
  'm', 'n', 'ŋ', 'l', 'ɹ', 'j', 'w', 'tʃ', 'dʒ', 'ɾ', 'ʔ', 'q', 'x', 'r',
  'ə', 'ɐ', 'ɚ', 'ᵻ', 'ɪ', 'i', 'iː', 'ɛ', 'æ', 'ʌ', 'ɑː', 'ɔ', 'ɔː', 'ʊ', 'uː', 'ɜː',
  'eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ', 'iə', 'oː',
  'ɑːɹ', 'ɔːɹ', 'oːɹ', 'ɪɹ', 'ɛɹ', 'ʊɹ', 'aɪɚ', 'aɪə', 'əl', 'n̩',
  'a', 'e', 'o', 'u', 'ɑ',
];

/**
 * Exact 46-symbol Persian-only IPA table matching tiny-ava-parisa.json
 */
export const TINY_AVA_PARISA_46_SYMBOLS: readonly string[] = [
  '<pad>', '<bos>', '<eos>', '<sp>', '<unk>',
  '،', '.', '؟', '!', '؛', ':', '«', '»', '(', ')', '—', '…',
  'p', 'b', 't', 'd', 'k', 'ɡ', 'q', 'ʔ', 'f', 'v', 's', 'z', 'ʃ', 'ʒ', 'x', 'h', 'tʃ', 'dʒ', 'm', 'n', 'l', 'r', 'j',
  'a', 'e', 'o', 'i', 'u', 'ɑ',
];

export const TINY_AVA_PARISA_SYMBOL_TO_ID: Record<string, number> = Object.fromEntries(
  TINY_AVA_PARISA_46_SYMBOLS.map((s, i) => [s, i])
);

export const TINY_AVA_PARISA_PHONE_SET = new Set<string>(TINY_AVA_PARISA_46_SYMBOLS.slice(17));

export const TINY_AVA_BOS = '<bos>';
export const TINY_AVA_EOS = '<eos>';
export const TINY_AVA_SP = '<sp>';
export const TINY_AVA_UNK = '<unk>';

export const TINY_AVA_MODEL_VOICES = ['parisa', 'voa_man', 'mana', 'en_f2'] as const;

export const TINY_AVA_PUNCTUATION = new Set([
  ',', '،', '.', '?', '؟', '!', ';', '؛', ':', '"', '«', '»', "'", '(', ')', '—', '…',
]);

export const TINY_AVA_SYMBOL_TO_ID: Record<string, number> = Object.fromEntries(
  TINY_AVA_V2_SYMBOLS.map((s, i) => [s, i])
);

export const TINY_AVA_PHONE_SET = new Set<string>(TINY_AVA_V2_SYMBOLS.slice(17));
export const TINY_AVA_VOWELS = new Set<string>([
  ...TINY_AVA_V2_SYMBOLS.slice(46),
  'a', 'e', 'o', 'i', 'u', 'ɑ',
]);

/**
 * Maps a punctuation token into the active model's symbol table
 * (Persian punctuation `، ؟ ؛ « »` for 46-symbol tiny-ava-parisa.json,
 * or ASCII punctuation `, ? ; "` for 84-symbol tiny-ava-v2.json).
 */
export function mapPunctToSymbolTable(
  ch: string,
  symbolToId: Record<string, number>
): string | null {
  if (ch in symbolToId) return ch;
  const fallbacks: Record<string, string[]> = {
    ',': ['،'],
    '،': [','],
    '?': ['؟'],
    '؟': ['?'],
    ';': ['؛'],
    '؛': [';'],
    '"': ['«', '»'],
    '«': ['"'],
    '»': ['"'],
  };
  const candidates = fallbacks[ch];
  if (candidates) {
    for (const c of candidates) {
      if (c in symbolToId) return c;
    }
  }
  return null;
}

const REPR1_TO_IPA: Record<string, string> = {
  a: 'a', A: 'ɑ', e: 'e', o: 'o', i: 'i', u: 'u',
  p: 'p', b: 'b', t: 't', d: 'd', k: 'k', g: 'ɡ', q: 'q', '?': 'ʔ',
  f: 'f', v: 'v', s: 's', z: 'z', S: 'ʃ', Z: 'ʒ', ';': 'ʒ', x: 'x', h: 'h',
  C: 'tʃ', j: 'dʒ', m: 'm', n: 'n', l: 'l', r: 'r', y: 'j',
};

const TINY_AVA_CHAR_MAP: Record<string, string> = {
  '\u064a': '\u06cc', // ي -> ی
  '\u0649': '\u06cc', // ى -> ی
  '\u0643': '\u06a9', // ك -> ک
  '\u0629': '\u0647', // ة -> ه
  '\u06c0': '\u0647', // ۀ -> ه
  '\u0623': '\u0627', // أ -> ا
  '\u0625': '\u0627', // إ -> ا
  '\u0671': '\u0627', // ٱ -> ا
  '\u0640': '',       // Tatweel
  '\u200b': '',       // Zero-width space
  '\u200d': '',       // ZWJ
  '\ufeff': '',       // BOM
  '\u00a0': ' ',      // NBSP
  // Arabic-Indic digits -> Persian digits
  '٠': '۰', '١': '۱', '٢': '۲', '٣': '۳', '٤': '۴',
  '٥': '۵', '٦': '۶', '٧': '۷', '٨': '۸', '٩': '۹',
  // Punctuation matching tiny-ava-v2.json
  '،': ',',
  '؟': '?',
  '؛': ';',
  '۔': '.',
  '«': '"',
  '»': '"',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '—',
  '―': '—',
};

const EN_LETTERS: Record<string, string> = {
  a: 'ˈeɪ', b: 'b ˈiː', c: 's ˈiː', d: 'd ˈiː', e: 'ˈiː', f: 'ˈɛ f', g: 'dʒ ˈiː', h: 'ˈeɪ tʃ',
  i: 'ˈaɪ', j: 'dʒ ˈeɪ', k: 'k ˈeɪ', l: 'ˈɛ l', m: 'ˈɛ m', n: 'ˈɛ n', o: 'ˈoʊ', p: 'p ˈiː',
  q: 'k j ˈuː', r: 'ˈɑːɹ', s: 'ˈɛ s', t: 't ˈiː', u: 'j ˈuː', v: 'v ˈiː', w: 'd ˈʌ b əl j uː',
  x: 'ˈɛ k s', y: 'w ˈaɪ', z: 'z ˈiː',
};

const PERSIAN_LETTERS = '[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]';
const MI_VERB_STEMS = [
  'روم', 'روی', 'رود', 'روند', 'توانم', 'توانی', 'تواند', 'توانند',
  'دانم', 'دانی', 'داند', 'دانند', 'خواهم', 'خواهی', 'خواهد', 'خواهند',
  'گویم', 'گویی', 'گوید', 'گویند', 'بینم', 'بینی', 'بیند', 'بینند',
  'کنم', 'کنی', 'کند', 'کنند', 'شوم', 'شوی', 'شود', 'شوند',
  'آیم', 'آیی', 'آید', 'آیند', 'دهم', 'دهی', 'دهد', 'دهند',
  'باشم', 'باشی', 'باشد', 'باشند', 'گیرم', 'گیری', 'گیرد', 'گیرند',
  'دارم', 'داری', 'دارد', 'دارند',
].join('|');

const MI_PREFIX_REGEX = new RegExp(`(^|\\s)(ن?می)\\s*(${MI_VERB_STEMS})(?=$|[\\s.,!?;:،؛؟])`, 'g');
const PLURAL_SUFFIX_REGEX = new RegExp(`(${PERSIAN_LETTERS}{2,})(ها|های|هایی)(?=[.,!?;:،؛؟\\s]|$)`, 'g');

const utf8Enc = new TextEncoder();
const utf8Dec = new TextDecoder('utf-8', { fatal: false });

export interface TinyAvaTokenizedSentence {
  syms: string[];
  ids: number[];
  stress: number[];
}

export interface TinyAvaModelMetadata {
  sample_rate: number;
  hop?: number;
  voices: string[];
  symbols: string[];
  max_tokens?: number;
  max_frames?: number;
  frontend?: string;
  inputs?: string[];
  outputs?: string[];
}

/**
 * Maps user-facing voice choice ('parisa' | 'mana' | 'maya') to tiny-ava-v2 voice tensor index.
 * tiny-ava-v2.json voices array: ["parisa", "voa_man", "mana", "en_f2"]
 */
export function mapTinyAvaVoiceToId(
  voice: TinyAvaVoiceId | string = 'parisa',
  modelVoices: readonly string[] = TINY_AVA_MODEL_VOICES
): number {
  const normalized = voice === 'maya' ? 'en_f2' : voice;
  const idx = modelVoices.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

/**
 * Converts Khoroos Reader's linear pitch multiplier (0.6–1.4, default 1.0)
 * into semitone shift expected by tiny-ava's `pitch_shift` tensor.
 */
export function pitchRatioToSemitones(pitchRatio: number = 1.0): number {
  const clamped = Math.max(0.6, Math.min(1.4, Number.isFinite(pitchRatio) ? pitchRatio : 1.0));
  const semitones = 12 * Math.log2(clamped);
  return Math.max(-6, Math.min(6, Number(semitones.toFixed(2))));
}

/**
 * Normalizes Persian + English text specifically for tiny-ava v2 / persian-g2p-tiny.
 */
export function normalizePersianForTinyAva(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // NFKC folds Arabic Presentation Forms (U+FB50..U+FEFC); ellipsis (…) is restored below.
  let s = raw;
  try {
    s = s.normalize('NFKC');
  } catch {
    // ignore if environment lacks String.prototype.normalize
  }

  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += ch in TINY_AVA_CHAR_MAP ? TINY_AVA_CHAR_MAP[ch] : ch;
  }

  // Strip non-vowel diacritics (tanween, sukun, superscript alef) while preserving
  // short vowel marks (\u064e fatha, \u064f damma, \u0650 kasra) and shadda (\u0651).
  out = out.replace(/[\u064b-\u064d\u0652-\u065f\u0670]/g, '');

  // Preserve tiny-ava ellipsis (…) and em-dash (—) tokens
  out = out.replace(/\.{3,}/g, '…').replace(/-{2,}|\s-\s/g, '—');

  // Inject safe morpheme ZWNJs (می‌روم, کتاب‌های) matching persianNormalizer.ts
  out = out.replace(MI_PREFIX_REGEX, '$1$2\u200c$3');
  out = out.replace(PLURAL_SUFFIX_REGEX, '$1\u200c$2');

  // Clean duplicate or boundary ZWNJs
  out = out
    .replace(/\u200c+/g, '\u200c')
    .replace(/\s+\u200c|\u200c\s+/g, ' ')
    .replace(/(^|[.,!?;:"()—…])\u200c+/g, '$1')
    .replace(/\u200c+([.,!?;:"()—…]|$)/g, '$1');

  // Convert Persian decimal separators into spoken "ممیز" when surrounded by Persian digits
  // (keep ASCII decimals intact for English/numeric chunks)
  out = out.replace(/([۰-۹])\.(?=[۰-۹])/g, '$1 ممیز ');

  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Splits text into short sentence/clause chunks (<= maxClauseLen chars) matching tiny-ava's
 * low-latency chunking strategy so each ByT5 G2P pass stays fast and within max_tokens.
 */
export function splitTinyAvaSentences(text: string, maxClauseLen: number = 95): string[] {
  const cleaned = text.replace(/[\s\ufeff]+/g, ' ').trim();
  if (!cleaned) return [];

  const raw = cleaned
    .split(/(?<=[.!؟?…]["')\]»]?)\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));

  const out: string[] = [];
  for (const s of raw) {
    if (s.length <= maxClauseLen) {
      out.push(s);
      continue;
    }
    const clauses = s
      .split(/(?<=[،,؛;:—])\s+/)
      .map((c) => c.trim())
      .filter((c) => /[\p{L}\p{N}]/u.test(c));
    const parts = clauses.length > 1 ? clauses : [s];
    for (const part of parts) {
      if (part.length <= maxClauseLen) {
        out.push(part);
        continue;
      }
      // Word-boundary split for long unpunctuated spans so ByT5 G2P stays fast
      let current = '';
      for (const word of part.split(/\s+/)) {
        if (!current) {
          current = word;
        } else if (current.length + 1 + word.length <= maxClauseLen) {
          current += ' ' + word;
        } else {
          out.push(current);
          current = word;
        }
      }
      if (current) out.push(current);
    }
  }
  return out;
}

export function ensureSentenceEndMark(text: string): string {
  const s = text.trim();
  if (!s) return s;
  return '.!؟?…،,;؛:'.includes(s.slice(-1)) ? s : s + '.';
}

/**
 * Splits normalized sentence into alternating [isPunctuation, value] chunks.
 * Recognizes both ASCII and Persian digits around '.', ',', ':' so decimals/times stay intact.
 */
export function splitPunctChunks(text: string): Array<[boolean, string]> {
  const pieces: Array<[boolean, string]> = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!TINY_AVA_PUNCTUATION.has(ch)) continue;

    const prev = i > 0 ? text[i - 1] : '';
    const nxt = i + 1 < text.length ? text[i + 1] : '';
    if (ch === "'" && /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(nxt)) continue;
    if ('.,:'.includes(ch) && /[0-9۰-۹]/.test(prev) && /[0-9۰-۹]/.test(nxt)) continue;

    const seg = text.slice(start, i).trim();
    if (seg) pieces.push([false, seg]);
    pieces.push([true, ch]);
    start = i + 1;
  }

  const tail = text.slice(start).trim();
  if (tail) pieces.push([false, tail]);
  return pieces;
}

/**
 * Partitions a non-punctuation text segment into contiguous Persian ('fa') and English ('en') spans.
 */
export function splitLangSpans(piece: string): Array<['fa' | 'en', string]> {
  const hasFa = /[\u0600-\u06FF]/.test(piece);
  const hasEn = /[A-Za-z]/.test(piece);
  if (hasFa && !hasEn) return [['fa', piece]];
  if (hasEn && !hasFa) return [['en', piece]];
  if (!hasFa && !hasEn) return [['fa', piece]];

  const spans: Array<['fa' | 'en', string]> = [];
  let cur: 'fa' | 'en' | null = null;
  let buf: string[] = [];

  for (const tok of piece.split(/\s+/)) {
    const lang: 'fa' | 'en' = /[\u0600-\u06FF]/.test(tok)
      ? 'fa'
      : /[A-Za-z]/.test(tok)
        ? 'en'
        : cur || 'fa';
    if (cur && lang !== cur) {
      spans.push([cur, buf.join(' ')]);
      buf = [];
    }
    cur = lang;
    buf.push(tok);
  }
  if (buf.length && cur) spans.push([cur, buf.join(' ')]);
  return spans;
}

/**
 * ByT5 UTF-8 byte encoding (id = byte + 3, terminated by EOS = 1n).
 */
export function byt5Encode(text: string): BigInt64Array {
  const bytes = utf8Enc.encode(text);
  const out = new BigInt64Array(bytes.length + 1);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = BigInt(bytes[i] + 3);
  }
  out[bytes.length] = 1n;
  return out;
}

/**
 * ByT5 UTF-8 byte decoding (bytes in range [3..258]).
 */
export function byt5Decode(ids: readonly number[]): string {
  const bytes: number[] = [];
  for (const id of ids) {
    if (id >= 3 && id <= 258) {
      bytes.push(id - 3);
    }
  }
  return utf8Dec.decode(new Uint8Array(bytes)).trim();
}

/**
 * Converts persian-g2p-tiny's `repr1` output into word-grouped [ipa, stressLevel] tuples.
 * - `zh` maps to `ʒ`
 * - Leading `?` before a vowel is dropped
 * - Last vowel in stem gets primary stress (1)
 * - Ezafe suffix (`-e` / `-ye`) vowel gets secondary stress (2)
 */
export function repr1ToWords(repr1: string): Array<Array<[string, number]>> {
  const words: Array<Array<[string, number]>> = [];
  for (const rawW of repr1.trim().split(/\s+/)) {
    if (!rawW) continue;

    const m = rawW.match(/^(.*?)-(ye|e)$/);
    let stem = m && m[1] ? m[1].replace(/-/g, '') : rawW.replace(/-/g, '');
    const ez = m && m[1] ? m[2] : '';

    if (stem.length >= 2 && stem[0] === '?' && 'aAeoiu'.includes(stem[1])) {
      stem = stem.slice(1);
    }

    const phones: Array<[string, number]> = [];
    for (let i = 0; i < stem.length; i++) {
      if (i + 1 < stem.length && stem[i] === 'z' && stem[i + 1] === 'h') {
        phones.push(['ʒ', 0]);
        i++;
        continue;
      }
      const ipa = REPR1_TO_IPA[stem[i]];
      if (ipa) phones.push([ipa, 0]);
    }

    for (let i = phones.length - 1; i >= 0; i--) {
      if (TINY_AVA_VOWELS.has(phones[i][0])) {
        phones[i][1] = 1;
        break;
      }
    }

    if (ez) {
      for (const ch of ez) {
        const ipa = REPR1_TO_IPA[ch];
        if (ipa) phones.push([ipa, TINY_AVA_VOWELS.has(ipa) ? 2 : 0]);
      }
    }

    if (phones.length) words.push(phones);
  }
  return words;
}

/**
 * Parses `lexicon_en.tsv` (`word\tipa phones`) into a fast lookup Map.
 */
export function parseEnglishLexicon(tsvText: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!tsvText) return map;
  for (const line of tsvText.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab > 0) {
      map.set(line.slice(0, tab), line.slice(tab + 1).trim());
    }
  }
  return map;
}

function enRuleFallback(word: string): string {
  const out: string[] = [];
  const letterMap: Record<string, string> = {
    a: 'æ', b: 'b', c: 'k', d: 'd', e: 'ɛ', f: 'f', g: 'ɡ', h: 'h',
    i: 'ɪ', j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'ɑː', p: 'p',
    q: 'k', r: 'ɹ', s: 's', t: 't', u: 'ʌ', v: 'v', w: 'w', x: 'k s', y: 'j', z: 'z',
  };

  for (let i = 0; i < word.length;) {
    const r = word.slice(i);
    if (r.startsWith('tion')) { out.push('ʃ', 'ə', 'n'); i += 4; }
    else if (r.startsWith('ch')) { out.push('tʃ'); i += 2; }
    else if (r.startsWith('sh')) { out.push('ʃ'); i += 2; }
    else if (r.startsWith('th')) { out.push('θ'); i += 2; }
    else if (r.startsWith('ph')) { out.push('f'); i += 2; }
    else if (r.startsWith('ng')) { out.push('ŋ'); i += 2; }
    else if (r.startsWith('ee') || r.startsWith('ea')) { out.push('iː'); i += 2; }
    else if (r.startsWith('oo')) { out.push('uː'); i += 2; }
    else if (r.startsWith('ou') || r.startsWith('ow')) { out.push('aʊ'); i += 2; }
    else if (r.startsWith('ai') || r.startsWith('ay')) { out.push('eɪ'); i += 2; }
    else if (r.startsWith('ck')) { out.push('k'); i += 2; }
    else {
      const m = letterMap[word[i]];
      if (m) out.push(...m.split(' '));
      i++;
    }
  }
  return out.join(' ');
}

/**
 * Converts an English text span into word-grouped [ipa, stressLevel] tuples using
 * the loaded TSV lexicon with acronym, inflection, and grapheme-rule fallbacks.
 */
export function englishToWords(
  span: string,
  enLex: ReadonlyMap<string, string>,
  phoneSet: ReadonlySet<string> = TINY_AVA_PHONE_SET
): Array<Array<[string, number]>> {
  const spaced = span.replace(/([a-z])([A-Z])/g, '$1 $2');
  const words: Array<Array<[string, number]>> = [];

  for (const m of spaced.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)) {
    const w = m[0];
    const low = w.toLowerCase();
    let ipaStr = enLex.get(low);

    if (!ipaStr) {
      if (
        (w.length >= 2 && w.length <= 4 && w === w.toUpperCase() && !/[AEIOU]/.test(w)) ||
        ['AI', 'UI', 'UX', 'ID', 'OS', 'TV', 'PC', 'OK', 'FT'].includes(w)
      ) {
        ipaStr = [...low].map((c) => EN_LETTERS[c] || '').filter(Boolean).join(' ');
      } else if (low.endsWith('s') && enLex.has(low.slice(0, -1))) {
        ipaStr = `${enLex.get(low.slice(0, -1))} z`;
      } else if (
        low.endsWith('ing') &&
        (enLex.has(low.slice(0, -3)) || enLex.has(`${low.slice(0, -3)}e`))
      ) {
        ipaStr = `${enLex.get(low.slice(0, -3)) || enLex.get(`${low.slice(0, -3)}e`)} ɪ ŋ`;
      } else if (
        low.endsWith('ed') &&
        (enLex.has(low.slice(0, -2)) || enLex.has(`${low.slice(0, -2)}e`))
      ) {
        ipaStr = `${enLex.get(low.slice(0, -2)) || enLex.get(`${low.slice(0, -2)}e`)} d`;
      } else {
        ipaStr = enRuleFallback(low);
      }
    }

    const units: Array<[string, number]> = [];
    for (let u of ipaStr.split(/\s+/)) {
      if (!u) continue;
      let lvl = 0;
      if (u.startsWith('ˈ')) { lvl = 1; u = u.slice(1); }
      else if (u.startsWith('ˌ')) { lvl = 2; u = u.slice(1); }
      if (phoneSet.has(u)) units.push([u, lvl]);
    }
    if (units.length) words.push(units);
  }
  return words;
}

/**
 * Full sentence phonemization & symbol-to-ID tokenization for tiny-ava v2.
 * Accepts an injectable `runFaG2P` callback so the frontend is 100% unit-testable
 * independently of ONNX Runtime Web.
 */
export async function phonemizeTinyAvaSentence(
  sentence: string,
  runFaG2P: (persianSpan: string) => Promise<string>,
  enLex: ReadonlyMap<string, string>,
  symbolToId: Record<string, number> = TINY_AVA_SYMBOL_TO_ID,
  phoneSet: ReadonlySet<string> = TINY_AVA_PHONE_SET,
  maxTokens: number = 512
): Promise<TinyAvaTokenizedSentence | null> {
  const norm = normalizePersianForTinyAva(ensureSentenceEndMark(sentence));
  if (!norm) return null;

  const pChunks = splitPunctChunks(norm);
  const syms: string[] = [TINY_AVA_BOS];
  const stress: number[] = [0];

  for (const [isPunct, val] of pChunks) {
    if (isPunct) {
      const mappedPunct = mapPunctToSymbolTable(val, symbolToId);
      if (mappedPunct && syms[syms.length - 1] !== mappedPunct) {
        syms.push(mappedPunct);
        stress.push(0);
      }
      continue;
    }

    for (const [lang, span] of splitLangSpans(val)) {
      const words =
        lang === 'fa'
          ? repr1ToWords(await runFaG2P(span))
          : englishToWords(span, enLex, phoneSet);

      for (const w of words) {
        const prev = syms[syms.length - 1];
        if (phoneSet.has(prev) || prev === TINY_AVA_UNK) {
          syms.push(TINY_AVA_SP);
          stress.push(0);
        }
        for (const [ph, lvl] of w) {
          const valid = phoneSet.has(ph) && ph in symbolToId;
          syms.push(valid ? ph : TINY_AVA_UNK);
          stress.push(valid ? lvl : 0);
        }
      }
    }
  }

  // Guard against exceeding model max_tokens (reserve 1 slot for <eos>)
  if (syms.length >= maxTokens) {
    syms.length = Math.max(1, maxTokens - 1);
    stress.length = syms.length;
  }

  syms.push(TINY_AVA_EOS);
  stress.push(0);

  if (!syms.some((s) => phoneSet.has(s))) return null;

  const unkId = symbolToId[TINY_AVA_UNK] ?? 4;
  return {
    syms,
    ids: syms.map((s) => symbolToId[s] ?? unkId),
    stress,
  };
}

/**
 * Peak limiter matching tiny-ava's `limitPeak` (PEAK = 0.99) to prevent clipping distortion.
 */
export function limitPeak(wave: Float32Array, peak: number = TINY_AVA_PEAK_LIMIT): Float32Array {
  let m = 0;
  for (let i = 0; i < wave.length; i++) {
    const a = Math.abs(wave[i]);
    if (a > m) m = a;
  }
  if (m <= peak || m === 0) return wave;
  const sc = peak / m;
  const out = new Float32Array(wave.length);
  for (let i = 0; i < wave.length; i++) {
    out[i] = wave[i] * sc;
  }
  return out;
}

/**
 * Validates parsed tiny-ava-v2.json metadata strictly.
 */
export function validateTinyAvaMetadata(
  input: string | Record<string, any> | null | undefined
): { valid: boolean; metadata?: TinyAvaModelMetadata; error?: string } {
  if (!input) {
    return { valid: false, error: 'tiny-ava metadata is missing' };
  }
  let parsed: any = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err: any) {
      return { valid: false, error: `Invalid tiny-ava metadata JSON: ${err?.message || 'parse error'}` };
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'tiny-ava metadata is not a valid object' };
  }
  if (typeof parsed.sample_rate !== 'number' || parsed.sample_rate <= 0) {
    return { valid: false, error: 'tiny-ava metadata missing valid sample_rate' };
  }
  if (!Array.isArray(parsed.voices) || parsed.voices.length === 0) {
    return { valid: false, error: 'tiny-ava metadata missing voices array' };
  }
  if (!Array.isArray(parsed.symbols) || parsed.symbols.length < 30) {
    return { valid: false, error: 'tiny-ava metadata missing valid symbols table' };
  }
  return { valid: true, metadata: parsed as TinyAvaModelMetadata };
}
