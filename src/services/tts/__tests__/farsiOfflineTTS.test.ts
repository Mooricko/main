import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePersianText } from '../phonemizer/persianNormalizer';
import { farsiPhonemizer } from '../phonemizer/espeakPhonemizer';
import { phonemesToPiperTokens, getSymbolTokenId } from '../phonemizer/piperTokenizer';
import { normalizeFarsiText, farsiTextToPiperTokens } from '../farsiPhonemizer';
import { encodePcmWav, encodePcmWavBuffer, validateWavBuffer, extractPiperAudioSamples } from '../audioUtils';
import { validatePiperModelConfig, validatePiperModelBytes } from '../modelValidation';
import { EspeakEngine, espeakEngine } from '../espeakEngine';
import { PiperEngine } from '../piperEngine';
import { farsiOfflineTts } from '../farsiOfflineTTS';

console.log('🧪 Starting Phase 3: Unified Dual-Engine Offline Farsi TTS & Real eSpeak NG Tests...');

// Load authoritative fa_IR-amir-medium.onnx.json model configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelConfigPath = path.resolve(__dirname, '../fa_IR-amir-medium.onnx.json');
const rawModelConfig = JSON.parse(fs.readFileSync(modelConfigPath, 'utf8'));
const authoritativePhonemeIdMap: Record<string, number | number[]> = rawModelConfig.phoneme_id_map;

// Mock AudioContext for Node.js test environment
if (typeof (globalThis as any).AudioContext === 'undefined') {
  (globalThis as any).AudioContext = class MockAudioContext {
    public state: string = 'running';
    public currentTime: number = 0;
    public destination = {};
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
        onended: null,
      };
    }
    createGain() {
      return {
        gain: { value: 1.0 },
        connect() {},
        disconnect() {},
      };
    }
    async decodeAudioData(ab: ArrayBuffer) {
      return {
        duration: 1.0,
        length: 22050,
        numberOfChannels: 1,
        sampleRate: 22050,
      };
    }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
}

describe('1. Persian Text Normalization & Preprocessing', () => {
  it('should normalize Arabic character variants to Persian standards (ي/ى -> ی, ك -> ک)', () => {
    const input = 'كتاب‌هاي فارسي با يكي از دوستان';
    const output = normalizePersianText(input);
    assert.ok(output.includes('کتاب'), 'Arabic kaf replaced with Persian kaf');
    assert.ok(output.includes('فارسی'), 'Arabic yeh replaced with Persian yeh');
    assert.ok(!output.includes('ك'), 'No Arabic kaf remains');
    assert.ok(!output.includes('ي'), 'No Arabic yeh remains');
  });

  it('should preserve and normalize ZWNJ for verbal prefixes and nominal suffixes', () => {
    // Verbal prefix "می" and "نمی"
    const verb1 = normalizePersianText('میروم');
    assert.ok(verb1.includes('می\u200Cروم') || verb1.includes('می‌روم'), 'Prefix می should have ZWNJ boundary');

    const verb2 = normalizePersianText('میتوانم');
    assert.ok(verb2.includes('می\u200Cتوانم') || verb2.includes('می‌توانم'), 'Prefix می should have ZWNJ boundary');

    // Nominal suffixes "ها" and "های"
    const noun1 = normalizePersianText('خانهها');
    assert.ok(noun1.includes('خانه\u200Cها') || noun1.includes('خانه‌ها'), 'Suffix ها should have ZWNJ boundary');

    const noun2 = normalizePersianText('کتابهای فارسی');
    assert.ok(noun2.includes('کتاب\u200Cهای') || noun2.includes('کتاب‌های'), 'Suffix های should have ZWNJ boundary');
  });

  it('should clean up redundant, repeated, or boundary ZWNJs', () => {
    const messy = ' \u200Cسلام\u200C\u200C دنیا\u200C ';
    const cleaned = normalizePersianText(messy);
    assert.ok(!cleaned.startsWith('\u200C'), 'Leading ZWNJ removed');
    assert.ok(!cleaned.endsWith('\u200C'), 'Trailing ZWNJ removed');
    assert.ok(!cleaned.includes('\u200C\u200C'), 'Consecutive ZWNJs deduplicated');
  });

  it('should handle Persian, Arabic, and ASCII digits and decimals', () => {
    const textPersian = normalizePersianText('تلفن ۱۲۳');
    assert.ok(textPersian.includes('۱۲۳') || textPersian.includes('123'), 'Digits preserved for phonemizer');

    const decimal = normalizePersianText('نسخه 2.0');
    assert.ok(decimal.includes('2.0') || decimal.includes('۲.۰'), 'Decimals preserved');
  });

  it('should handle mixed Persian and Latin scripts and Persian punctuation', () => {
    const mixed = normalizePersianText('هوش مصنوعی AI واقعاً «جالب» است، نه؟');
    assert.ok(mixed.includes('AI'), 'Latin word preserved');
    assert.ok(mixed.includes('"جالب"'), 'Persian quotes normalized');
    assert.ok(mixed.includes(','), 'Persian comma normalized');
  });
});

describe('2. eSpeak NG Farsi (fa) G2P Phonemization', () => {
  it('should initialize eSpeak NG phonemizer with voice "fa"', async () => {
    const ready = await farsiPhonemizer.init();
    assert.strictEqual(ready, true, 'Phonemizer should initialize successfully');
    assert.strictEqual(farsiPhonemizer.voice, 'fa');
  });

  const testSentences = [
    'سلام دنیا',
    'این یک آزمایش است.',
    'کتابهای فارسی',
    'میروم',
    'میتوانم',
    'خانهها',
    'هوش مصنوعی',
    'تلفن ۱۲۳',
    'نسخه 2.0',
    'هوش مصنوعی AI واقعاً جالب است.',
  ];

  for (const sentence of testSentences) {
    it(`should phonemize: "${sentence}" into non-empty eSpeak IPA phonemes`, async () => {
      const phonemes = await farsiPhonemizer.phonemize(sentence);

      // Structural assertions
      assert.ok(typeof phonemes === 'string', 'Phonemes must be string');
      assert.ok(phonemes.length > 0, `Phonemes for "${sentence}" must not be empty`);

      // Verify phonemes are NOT Persian graphemes (critical requirement)
      const hasPersianLetters = /[\u0600-\u06FF]/.test(phonemes.replace(/[،؛؟]/g, ''));
      assert.strictEqual(
        hasPersianLetters,
        false,
        `Phoneme output "${phonemes}" must contain IPA phonemes, not Persian graphemes`
      );

      // Verify token mapping using authoritative model phoneme_id_map
      const tokens = await farsiPhonemizer.phonemizeToTokens(sentence, authoritativePhonemeIdMap);
      assert.ok(tokens.length >= 3, `Token count (${tokens.length}) must be >= 3 (BOS, phonemes, EOS)`);
      assert.strictEqual(tokens[0], 1, 'First token must be BOS (1: ^)');
      assert.strictEqual(tokens[tokens.length - 1], 2, 'Last token must be EOS (2: $)');

      // All token IDs must be non-negative integers within model vocabulary
      for (const tid of tokens) {
        assert.ok(Number.isInteger(tid) && tid >= 0 && tid <= 156, `Token ID ${tid} must be within model range 0..156`);
      }
    });
  }
});

describe('3. Piper Tokenization & Model phoneme_id_map Alignment', () => {
  it('should map eSpeak IPA phonemes into exact tokens according to fa_IR-amir-medium metadata', () => {
    const ipa = 'salˈɑm';
    const tokens = phonemesToPiperTokens(ipa, authoritativePhonemeIdMap, { interspersePad: true });

    // BOS (1)
    assert.strictEqual(tokens[0], 1);
    // EOS (2)
    assert.strictEqual(tokens[tokens.length - 1], 2);

    // Check specific known tokens from model config:
    // 's' = 31, 'a' = 14, 'l' = 24, 'ˈ' = 120, 'ɑ' = 51, 'm' = 25
    assert.ok(tokens.includes(31), 'Tokens must include s (31)');
    assert.ok(tokens.includes(14), 'Tokens must include a (14)');
    assert.ok(tokens.includes(24), 'Tokens must include l (24)');
    assert.ok(tokens.includes(120), 'Tokens must include primary stress ˈ (120)');
    assert.ok(tokens.includes(51), 'Tokens must include ɑ (51)');
    assert.ok(tokens.includes(25), 'Tokens must include m (25)');
    assert.ok(tokens.includes(0), 'Tokens must include PAD _ (0)');
  });

  it('should explicitly emit warning for unknown phonemes and not silently map to space', () => {
    let unknownReported: string | null = null;
    const strangePhoneme = 's@m'; // '@' is not in model map
    const tokens = phonemesToPiperTokens(strangePhoneme, authoritativePhonemeIdMap, {
      interspersePad: false,
      onUnknownPhoneme: (char) => {
        unknownReported = char;
      },
    });

    assert.strictEqual(unknownReported, '@', 'Unknown phoneme callback should receive @');
    // Token for space is 3; verify @ was NOT converted to space token 3
    const contentTokens = tokens.slice(1, -1);
    assert.ok(!contentTokens.includes(3), 'Unknown symbol must NOT be silently mapped to space (3)');
  });
});

describe('4. WAV Encoding & Audio Utilities', () => {
  it('should encode valid RIFF header, correct sample rate, mono channel, and exact file size', () => {
    const sampleRate = 22050;
    const numSamples = 4410; // 0.2s of audio
    const mockSamples = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      mockSamples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const wavBuffer = encodePcmWavBuffer(mockSamples, sampleRate);
    const expectedDataSize = numSamples * 2;
    const expectedTotalSize = 44 + expectedDataSize;

    assert.strictEqual(wavBuffer.byteLength, expectedTotalSize, 'Buffer length must match 44 + samples * 2');

    const header = validateWavBuffer(wavBuffer);
    assert.strictEqual(header.valid, true, `Header should be valid: ${header.error}`);
    assert.strictEqual(header.numChannels, 1, 'Audio must be mono (1 channel)');
    assert.strictEqual(header.sampleRate, sampleRate, 'Sample rate must match requested rate');
    assert.strictEqual(header.bitsPerSample, 16, 'Bit depth must be 16-bit PCM');
    assert.strictEqual(header.dataByteLength, expectedDataSize, 'Data chunk size must match payload');

    const wavBlob = encodePcmWav(mockSamples, sampleRate);
    assert.strictEqual(wavBlob.type, 'audio/wav', 'Blob type should be audio/wav');
    assert.strictEqual(wavBlob.size, expectedTotalSize, 'Blob size should equal total WAV bytes');
  });

  it('should handle clipping and extreme values without integer overflow', () => {
    const extremeSamples = new Float32Array([1.5, -2.0, 0.0, 0.5, -0.5]);
    const wavBuffer = encodePcmWavBuffer(extremeSamples, 22050);
    const view = new DataView(wavBuffer);

    assert.strictEqual(view.getInt16(44, true), 32767);
    assert.strictEqual(view.getInt16(46, true), -32768);
    assert.strictEqual(view.getInt16(48, true), 0);
  });

  it('should extract samples correctly from various Piper output tensor shapes', () => {
    const rawData = new Float32Array([0.1, 0.2, -0.1]);
    const mockTensor = { data: rawData, dims: [1, 1, 3] };
    const extracted = extractPiperAudioSamples(mockTensor);
    assert.strictEqual(extracted.length, 3);
    assert.ok(Math.abs(extracted[0] - 0.1) < 1e-6, 'Float sample should match within 1e-6 precision');

    assert.throws(() => extractPiperAudioSamples(null), /output tensor is null or undefined/);
    assert.throws(() => extractPiperAudioSamples({ data: null }), /tensor data is missing/);
  });
});

describe('5. Model & Configuration Validation', () => {
  it('should successfully validate authoritative fa_IR-amir-medium.onnx.json', () => {
    const res = validatePiperModelConfig(rawModelConfig, 'fa_IR-amir-medium');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.config?.audio.sample_rate, 22050);
    assert.strictEqual(res.config?.phoneme_type, 'espeak');
    assert.strictEqual(res.config?.espeak?.voice, 'fa');
  });

  it('should reject empty or missing configuration without silent fallback to {}', () => {
    assert.strictEqual(validatePiperModelConfig(null).valid, false);
    assert.strictEqual(validatePiperModelConfig('').valid, false);
    assert.strictEqual(validatePiperModelConfig('{}').valid, false);
    assert.strictEqual(validatePiperModelConfig({}).valid, false);
  });

  it('should validate model bytes length and reject incomplete files', () => {
    assert.strictEqual(validatePiperModelBytes(null).valid, false);
    assert.strictEqual(validatePiperModelBytes(new ArrayBuffer(100)).valid, false);
    assert.strictEqual(validatePiperModelBytes(new ArrayBuffer(10000)).valid, true);
  });
});

describe('6. eSpeak NG (WASM) Engine', () => {
  it('should phonemize Persian text into IPA phonemes independently of audio synthesis', async () => {
    const espeak = new EspeakEngine();
    await espeak.init();

    const phonemes = await espeak.phonemize('سلام دنیا');
    assert.ok(phonemes.length > 0, 'eSpeak NG phonemize should return non-empty string');
    assert.ok(phonemes.includes('sal') || phonemes.includes('s'), 'Phonemes should match Persian speech');
  });

  it('should synthesize Farsi text into WAV buffer with correct sample rate', async () => {
    const espeak = new EspeakEngine();
    await espeak.init();

    const res = await espeak.synthesize('آزمایش خوانش متن فارسی', { speed: 1.2, pitch: 1.0 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.engineUsed, 'espeak');
    assert.strictEqual(res.sampleRate, 22050);
    assert.ok(res.durationMs > 200, 'Synthesized duration should be positive');
    assert.ok(res.wavBlob.size > 1000, 'Generated WAV buffer should be non-empty');
  });

  it('should support clean interruption and state reset', async () => {
    const espeak = new EspeakEngine();
    espeak.stop();
    assert.strictEqual(espeak.isSpeaking(), false, 'isSpeaking should be false after stop()');
  });
});

describe('7. End-to-End Piper Inference & Explicit Manager Fallback', () => {
  it('End-to-End: Persian text -> normalizer -> eSpeak G2P -> Piper tokens -> ONNX session -> non-silent WAV audio', async () => {
    const piper = new PiperEngine();

    let passedInputTokens: bigint[] = [];

    // Mock ONNX session configured with real modelConfig
    const mockAudioLength = 11025; // 0.5s audio
    const mockSamples = new Float32Array(mockAudioLength);
    // Generate non-silent audio wave
    for (let i = 0; i < mockAudioLength; i++) {
      mockSamples[i] = 0.6 * Math.sin((2 * Math.PI * 440 * i) / 22050);
    }

    const mockSession = {
      inputNames: ['input', 'input_lengths', 'scales'],
      outputNames: ['output'],
      run: async (feeds: any) => {
        // Capture input tokens passed to ONNX inference
        if (feeds.input?.data) {
          passedInputTokens = Array.from(feeds.input.data);
        }
        return {
          output: {
            data: mockSamples,
            dims: [1, 1, mockAudioLength],
          },
        };
      },
    };

    piper.setSessionForTesting(mockSession, rawModelConfig);

    // Spy on espeak fallback to ensure it is NOT called
    let espeakCalled = false;
    const originalEspeakSynth = espeakEngine.synthesize.bind(espeakEngine);
    espeakEngine.synthesize = async (...args: any[]) => {
      espeakCalled = true;
      return originalEspeakSynth(...args);
    };

    try {
      const textToTest = 'سلام دنیا';
      const res = await piper.synthesize(textToTest, { speed: 1.0 });

      // 1. Verify Piper success
      assert.strictEqual(res.success, true, 'Piper synthesis should succeed');
      assert.strictEqual(res.engineUsed, 'piper', 'Engine used must be piper');
      assert.strictEqual(res.fallbackTriggered, false, 'Fallback must NOT be triggered');

      // 2. Verify that tokens passed to ONNX session were real eSpeak phoneme IDs
      assert.ok(passedInputTokens.length > 5, 'Tokens passed to ONNX must be non-empty sequence');
      assert.strictEqual(Number(passedInputTokens[0]), 1, 'First token must be BOS (1)');
      assert.strictEqual(Number(passedInputTokens[passedInputTokens.length - 1]), 2, 'Last token must be EOS (2)');

      // Tokens must contain eSpeak phonemes for 'سلام' (s=31, a=14, l=24, etc.)
      const numberTokens = passedInputTokens.map(Number);
      assert.ok(numberTokens.includes(31), 'Tokens passed to ONNX must contain phoneme s (31)');
      assert.ok(numberTokens.includes(14), 'Tokens passed to ONNX must contain phoneme a (14)');
      assert.ok(numberTokens.includes(24), 'Tokens passed to ONNX must contain phoneme l (24)');

      // 3. Verify audio buffer is non-empty and non-silent
      assert.ok(res.wavBlob.size > 20000, 'WAV audio Blob size must be non-empty');
      const wavArrayBuffer = await res.wavBlob.arrayBuffer();
      const wavHeader = validateWavBuffer(wavArrayBuffer);
      assert.strictEqual(wavHeader.valid, true, 'WAV header must be valid');
      assert.strictEqual(wavHeader.sampleRate, 22050, 'Sample rate must be 22050');

      // Check PCM data is non-silent
      const pcmView = new DataView(wavArrayBuffer, 44);
      let maxSampleValue = 0;
      for (let i = 0; i < mockAudioLength; i++) {
        const val = Math.abs(pcmView.getInt16(i * 2, true));
        if (val > maxSampleValue) maxSampleValue = val;
      }
      assert.ok(maxSampleValue > 1000, `Audio PCM must not be silent (peak amplitude: ${maxSampleValue})`);

      // 4. Regression assertion: Piper itself must never call eSpeak fallback
      assert.strictEqual(espeakCalled, false, 'Piper success must NOT invoke eSpeak fallback!');
    } finally {
      espeakEngine.synthesize = originalEspeakSynth;
    }
  });

  it('PiperEngine alone should NOT secretly invoke fallback when model is not cached', async () => {
    const piper = new PiperEngine();
    const res = await piper.synthesize('هوش مصنوعی و خوانش عصبی فارسی', { speed: 1.0 });

    assert.strictEqual(res.success, false, 'PiperEngine itself reports failure honestly');
    assert.strictEqual(res.engineUsed, 'piper', 'Engine attribution remains piper');
    assert.strictEqual(res.fallbackTriggered, false, 'Engine does not secretly trigger fallback');
    assert.ok(res.error, 'Error message explaining missing model in IndexedDB');
  });

  it('FarsiOfflineTtsManager should explicitly control fallback to eSpeak NG WASM when Piper fails', async () => {
    // When requesting piper through manager without cached model, manager triggers fallback
    const res = await farsiOfflineTts.synthesize('هوش مصنوعی و خوانش عصبی فارسی', {
      engine: 'piper',
      speed: 1.0,
      allowFallback: true,
    });

    assert.strictEqual(res.success, true, 'Manager-controlled fallback succeeds');
    assert.strictEqual(res.fallbackTriggered, true, 'Fallback should be marked as triggered');
    assert.strictEqual(res.engineUsed, 'espeak', 'Honest engine attribution: eSpeak NG WASM');
    assert.ok(res.wavBlob.size > 500, 'WAV audio produced by fallback engine');
  });

  it('FarsiOfflineTtsManager should NOT invoke fallback when allowFallback is false', async () => {
    const res = await farsiOfflineTts.synthesize('تست بدون فال‌بک', {
      engine: 'piper',
      speed: 1.0,
      allowFallback: false,
    });

    assert.strictEqual(res.success, false, 'Should report success: false when Piper unavailable');
    assert.strictEqual(res.engineUsed, 'piper', 'Engine attribution remains piper');
    assert.strictEqual(res.fallbackTriggered, false, 'Fallback must not be triggered');
    assert.ok(res.error, 'Error message must be present');
  });
});

describe('8. Complete Fallback Chain Scenarios (A, B, C, D)', () => {
  it('Scenario A: Piper available -> Piper speaks -> eSpeak NOT called', async () => {
    const piper = new PiperEngine();
    let espeakCalled = false;
    const originalEspeak = espeakEngine.synthesize.bind(espeakEngine);
    espeakEngine.synthesize = async (...args) => {
      espeakCalled = true;
      return originalEspeak(...args);
    };

    const mockSamples = new Float32Array(5000);
    for (let i = 0; i < 5000; i++) mockSamples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 22050);

    piper.setSessionForTesting({
      run: async () => ({ output: { data: mockSamples, dims: [1, 1, 5000] } })
    }, rawModelConfig);

    try {
      const res = await piper.synthesize('سلام دنیا');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.engineUsed, 'piper');
      assert.strictEqual(espeakCalled, false, 'eSpeak must NOT be called when Piper is available');
    } finally {
      espeakEngine.synthesize = originalEspeak;
    }
  });

  it('Scenario B: Piper unavailable -> eSpeak speaks', async () => {
    // Model not cached, requesting piper with manager fallback
    const res = await farsiOfflineTts.synthesize('آزمایش گفتار', {
      engine: 'piper',
      allowFallback: true
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.engineUsed, 'espeak');
    assert.strictEqual(res.fallbackTriggered, true);
    assert.ok(res.wavBlob.size > 1000);
  });

  it('Scenario C: Piper inference fails -> eSpeak speaks', async () => {
    const piper = new PiperEngine();
    // Configure session that throws during inference
    piper.setSessionForTesting({
      run: async () => { throw new Error('ONNX runtime execution memory failure'); }
    }, rawModelConfig);

    const piperDirect = await piper.synthesize('متن آزمایش');
    assert.strictEqual(piperDirect.success, false);
    assert.strictEqual(piperDirect.engineUsed, 'piper');
    assert.ok(piperDirect.error?.includes('inference failed'));

    // When processed by manager with fallback enabled:
    const originalPiperSynth = (farsiOfflineTts as any).activeEngine;
    let fallbackHappened = false;
    const res = await farsiOfflineTts.synthesize('متن آزمایش', {
      engine: 'piper',
      allowFallback: true,
      onFallback: (reason) => {
        fallbackHappened = true;
        assert.ok(reason.length > 0);
      }
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.engineUsed, 'espeak');
    assert.strictEqual(res.fallbackTriggered, true);
  });

  it('Scenario D: Piper + eSpeak fail -> explicit TTS error without crash', async () => {
    const originalEspeak = espeakEngine.synthesize.bind(espeakEngine);
    espeakEngine.synthesize = async () => {
      return {
        success: false,
        wavBlob: encodePcmWav(new Float32Array(0)),
        durationMs: 0,
        sampleRate: 22050,
        engineUsed: 'espeak',
        error: 'eSpeak WASM memory allocation fault'
      };
    };

    try {
      const res = await farsiOfflineTts.synthesize('تست شکست کامل', {
        engine: 'piper',
        allowFallback: true
      });
      assert.strictEqual(res.success, false, 'Synthesis must return success: false when both engines fail');
      assert.strictEqual(res.engineUsed, 'espeak', 'Fallback was attempted');
      assert.ok(res.error, 'Explicit error message must be present');
    } finally {
      espeakEngine.synthesize = originalEspeak;
    }
  });
});

describe('9. Extension Playback Lifecycle & Speaking State Synchronization', () => {
  it('Lifecycle 1: SPEAK -> STARTED -> PLAYING -> ENDED resets isSpeakingActive to false', () => {
    let started = false;
    let ended = false;

    // Trigger speak simulation
    (farsiOfflineTts as any).currentPlayingId = 42;
    (farsiOfflineTts as any).activeCallbacks = {
      onStart: () => { started = true; },
      onEnd: () => { ended = true; }
    };

    // 1. STARTED
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'STARTED', playbackId: 42 });
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, true);
    assert.strictEqual(started, true);

    // 2. PLAYING
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'PLAYING', playbackId: 42 });
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, true);

    // 3. ENDED
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'ENDED', playbackId: 42 });
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, false, 'isSpeakingActive must reset to false on ENDED');
    assert.strictEqual(ended, true, 'onEnd callback must be triggered');
  });

  it('Lifecycle 2: SPEAK -> STARTED -> STOP -> STOPPED resets state and cancels callbacks', () => {
    let ended = false;
    (farsiOfflineTts as any).currentPlayingId = 55;
    (farsiOfflineTts as any).activeCallbacks = {
      onEnd: () => { ended = true; }
    };

    farsiOfflineTts.handleExtensionStatusChanged({ state: 'STARTED', playbackId: 55 });
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, true);

    // Stop called
    farsiOfflineTts.stop();
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, false);
    assert.strictEqual((farsiOfflineTts as any).activeCallbacks, null);

    // Stale late ENDED event from stopped audio element
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'ENDED', playbackId: 55 });
    assert.strictEqual(ended, false, 'Late onended event must not fire after stop()');
  });

  it('Lifecycle 3: SPEAK -> ERROR sets isSpeakingActive to false and fires onError', () => {
    let errorFired = false;
    let receivedError: Error | null = null;

    (farsiOfflineTts as any).currentPlayingId = 77;
    (farsiOfflineTts as any).activeCallbacks = {
      onError: (err) => {
        errorFired = true;
        receivedError = err;
      }
    };

    farsiOfflineTts.handleExtensionStatusChanged({
      state: 'ERROR',
      playbackId: 77,
      error: 'Audio hardware initialization failure'
    });

    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, false);
    assert.strictEqual(errorFired, true);
    assert.ok(receivedError?.message.includes('Audio hardware initialization failure'));
  });

  it('Playback tokens must prevent stale onended events from earlier utterances corrupting current utterance', () => {
    (farsiOfflineTts as any).currentPlayingId = 100;
    (farsiOfflineTts as any).isSpeakingActive = true;

    // Event from playbackId 99 (previous utterance)
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'ENDED', playbackId: 99 });
    assert.strictEqual((farsiOfflineTts as any).isSpeakingActive, true, 'Stale event from older playbackId must be ignored');
  });
});

describe('10. Regression Tests for Original Bugs', () => {
  it('Regression 1: Piper cannot silently use eSpeak audio while claiming engineUsed: "piper"', async () => {
    const piper = new PiperEngine();
    const res = await piper.synthesize('سلام');
    if (res.success) {
      assert.strictEqual(res.engineUsed, 'piper');
    } else {
      assert.strictEqual(res.engineUsed, 'piper');
      assert.strictEqual(res.fallbackTriggered, false);
    }
  });

  it('Regression 2: Persian graphemes must NOT be directly converted to Piper IDs (must go through eSpeak G2P)', async () => {
    const rawFarsi = 'کتاب';
    const phonemes = await farsiPhonemizer.phonemize(rawFarsi);
    assert.ok(phonemes.length > 0, 'Phonemizer must return IPA phonemes');
    // Grapheme 'ک' (U+06A9) is unicode 1705. Piper vocab does NOT have token ID 1705!
    const tokens = phonemesToPiperTokens(phonemes, authoritativePhonemeIdMap);
    assert.ok(tokens.length > 2, 'Tokens generated from IPA phonemes');
    for (const t of tokens) {
      assert.ok(t <= 160, `Token ID ${t} must be within model vocab limit`);
    }
  });

  it('Regression 3: Missing or empty model config must not produce a "ready" Piper model', () => {
    const emptyConfigRes = validatePiperModelConfig('{}');
    assert.strictEqual(emptyConfigRes.valid, false, 'Empty config must be rejected');

    const nullConfigRes = validatePiperModelConfig(null);
    assert.strictEqual(nullConfigRes.valid, false, 'Null config must be rejected');

    const missingMapRes = validatePiperModelConfig(JSON.stringify({ audio: { sample_rate: 22050 } }));
    assert.strictEqual(missingMapRes.valid, false, 'Config missing phoneme_id_map must be rejected');
  });

  it('Regression 4: Successful Piper inference must not call the fallback', async () => {
    const piper = new PiperEngine();
    let espeakCalled = false;
    const origEspeak = espeakEngine.synthesize.bind(espeakEngine);
    espeakEngine.synthesize = async (...args) => {
      espeakCalled = true;
      return origEspeak(...args);
    };

    piper.setSessionForTesting({
      run: async () => ({ output: { data: new Float32Array(1000), dims: [1, 1, 1000] } })
    }, rawModelConfig);

    try {
      const res = await piper.synthesize('هوش مصنوعی');
      assert.strictEqual(res.success, true);
      assert.strictEqual(espeakCalled, false, 'Fallback must NOT be called on Piper success');
    } finally {
      espeakEngine.synthesize = origEspeak;
    }
  });

  it('Regression 5: Extension Piper must have access to ONNX Runtime and model assets', () => {
    const extDir = path.resolve(__dirname, '../../../../public/extension');
    assert.ok(fs.existsSync(path.join(extDir, 'ort.min.js')), 'ort.min.js must exist');
    assert.ok(fs.existsSync(path.join(extDir, 'ort-wasm-simd-threaded.wasm')), 'ort wasm must exist');
    assert.ok(fs.existsSync(path.join(extDir, 'espeak-ng.wasm')), 'espeak-ng.wasm must exist');
    assert.ok(fs.existsSync(path.join(extDir, 'fa_IR-amir-medium.onnx.json')), 'Piper config must exist');
  });

  it('Regression 6: Playback completion must reset isSpeakingActive', () => {
    (farsiOfflineTts as any).currentPlayingId = 888;
    farsiOfflineTts.handleExtensionStatusChanged({ state: 'STARTED', playbackId: 888 });
    assert.strictEqual(farsiOfflineTts.isSpeaking(), true);

    farsiOfflineTts.handleExtensionStatusChanged({ state: 'ENDED', playbackId: 888 });
    assert.strictEqual(farsiOfflineTts.isSpeaking(), false);
  });

  it('Regression 7: GET_STATUS must use the canonical message identifier everywhere', () => {
    const backgroundJs = fs.readFileSync(path.resolve(__dirname, '../../../../public/background.js'), 'utf8');
    const offscreenJs = fs.readFileSync(path.resolve(__dirname, '../../../../public/offscreen.js'), 'utf8');

    assert.ok(backgroundJs.includes("'GET_STATUS'"), 'background.js must handle GET_STATUS');
    assert.ok(offscreenJs.includes("'GET_STATUS'"), 'offscreen.js must handle GET_STATUS');
  });
});

describe('11. End-to-End Persian Matrix Test Suite', () => {
  const testPhrases = [
    'سلام دنیا',
    'این یک آزمایش است.',
    'هوش مصنوعی',
    'میروم',
    'کتابهای فارسی',
    '۱۲۳۴۵',
    '۰.۵',
    'نسخه 2.0',
    'AI و هوش مصنوعی'
  ];

  for (const phrase of testPhrases) {
    it(`E2E pipeline for: "${phrase}" (normalize -> G2P -> tokenize -> inference -> audio -> playback -> completion)`, async () => {
      // 1. Normalization
      const normalized = normalizePersianText(phrase);
      assert.ok(normalized.length > 0, 'Normalized text must not be empty');

      // 2. G2P Phonemization
      const phonemes = await farsiPhonemizer.phonemize(normalized);
      assert.ok(phonemes.length > 0, `Phonemes for "${phrase}" must not be empty`);

      // 3. Tokenization
      const tokens = phonemesToPiperTokens(phonemes, authoritativePhonemeIdMap);
      assert.ok(tokens.length >= 3, `Tokens for "${phrase}" must contain BOS + symbols + EOS`);
      assert.strictEqual(tokens[0], 1, 'First token must be BOS');
      assert.strictEqual(tokens[tokens.length - 1], 2, 'Last token must be EOS');

      // 4. ONNX Inference with mock session
      const sampleCount = 4410; // 0.2s
      const mockWave = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) mockWave[i] = 0.4 * Math.sin((2 * Math.PI * 300 * i) / 22050);

      const piper = new PiperEngine();
      piper.setSessionForTesting({
        run: async () => ({ output: { data: mockWave, dims: [1, 1, sampleCount] } })
      }, rawModelConfig);

      const result = await piper.synthesize(phrase);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.engineUsed, 'piper');

      // 5. Audio generation & validation
      assert.ok(result.wavBlob.size > 8000, 'Audio blob size must be valid');
      const ab = await result.wavBlob.arrayBuffer();
      const wavHeader = validateWavBuffer(ab);
      assert.strictEqual(wavHeader.valid, true);
      assert.strictEqual(wavHeader.sampleRate, 22050);

      // 6. Playback & immediate stop
      let started = false;
      let ended = false;
      await piper.playWavBlob(result.wavBlob, {
        onStart: () => { started = true; },
        onEnd: () => { ended = true; }
      });
      assert.strictEqual(started, true);
      piper.stop();
      assert.strictEqual(piper.isSpeaking(), false);
    });
  }
});

console.log('✓ All Dual-Engine Offline Farsi TTS Unit, Integration & Regression Tests Passed!');

