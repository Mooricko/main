/**
 * Types and interfaces for Farsi Phonemizer and Piper Tokenizer
 */

export interface PhonemizerClause {
  phonemes: string;
  terminator?: string;
  isSentenceEnd?: boolean;
}

export interface PiperTokenizeOptions {
  interspersePad?: boolean; // default true (VITS Piper format)
  bosToken?: number;        // default 1 ('^')
  eosToken?: number;        // default 2 ('$')
  padToken?: number;        // default 0 ('_')
  onUnknownPhoneme?: (char: string) => void;
}

export interface FarsiPhonemizer {
  readonly voice: string;
  init(): Promise<boolean>;
  isReady(): boolean;
  phonemize(text: string): Promise<string>;
  phonemizeToTokens(
    text: string,
    phonemeIdMap?: Record<string, number | number[]>,
    options?: PiperTokenizeOptions
  ): Promise<number[]>;
}
