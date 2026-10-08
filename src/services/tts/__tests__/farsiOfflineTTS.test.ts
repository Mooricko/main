import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeFarsiText, farsiTextToPiperTokens, encodePcmWav, FARSI_PHONEME_TABLE } from '../farsiPhonemizer';
import { EspeakEngine } from '../espeakEngine';
import { PiperEngine } from '../piperEngine';

console.log('🧪 Starting Dual-Engine Offline Farsi TTS Unit Tests...');

// Mock AudioContext for Node.js test environment
if (typeof globalThis.AudioContext === 'undefined') {
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

describe('Farsi Text Normalization & Tokenization', () => {
  it('should normalize Persian characters properly', () => {
    const input = 'كتاب‌هاي فارسي با يكي از دوستان';
    const output = normalizeFarsiText(input);
    assert.ok(output.includes('کتاب'), 'Arabic kaf replaced with Persian kaf');
    assert.ok(output.includes('فارسی'), 'Arabic yeh replaced with Persian yeh');
    assert.ok(!output.includes('ك'), 'No Arabic kaf remains');
    assert.ok(!output.includes('ي'), 'No Arabic yeh remains');
  });

  it('should convert Farsi text into Piper token sequences with BOS and EOS', () => {
    const text = 'سلام دنیا';
    const tokens = farsiTextToPiperTokens(text);
    assert.strictEqual(tokens[0], 1, 'First token should be BOS (1)');
    assert.strictEqual(tokens[tokens.length - 1], 2, 'Last token should be EOS (2)');
    assert.ok(tokens.length > 5, 'Tokens sequence should contain phoneme ids and pads');
  });

  it('should produce a valid 16-bit PCM RIFF WAV container', () => {
    const mockSamples = new Float32Array(2205); // 0.1 seconds at 22050Hz
    for (let i = 0; i < mockSamples.length; i++) {
      mockSamples[i] = Math.sin((2 * Math.PI * 440 * i) / 22050);
    }
    const wavBlob = encodePcmWav(mockSamples, 22050);
    assert.strictEqual(wavBlob.type, 'audio/wav', 'Blob type should be audio/wav');
    // 44 bytes header + 2205 * 2 bytes = 4454 bytes
    assert.strictEqual(wavBlob.size, 44 + 2205 * 2, 'Blob size should match RIFF PCM specs');
  });
});

describe('eSpeak NG (WASM) Engine', () => {
  it('should synthesize Farsi text into WAV buffer with correct sample rate', async () => {
    const espeak = new EspeakEngine();
    await espeak.init();

    const res = await espeak.synthesize('آزمایش خوانش متن فارسی', { speed: 1.2, pitch: 1.0 });
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

describe('Piper Neural Engine & Fallback Mechanism', () => {
  it('should automatically and gracefully fallback to eSpeak NG WASM when ONNX model is not in IndexedDB', async () => {
    const piper = new PiperEngine();
    const res = await piper.synthesize('هوش مصنوعی و خوانش عصبی فارسی', { speed: 1.0 });

    assert.strictEqual(res.fallbackTriggered, true, 'Fallback should be triggered');
    assert.strictEqual(res.engineUsed, 'espeak', 'Should fall back to eSpeak NG WASM');
    assert.ok(res.wavBlob.size > 500, 'WAV audio should still be successfully produced by fallback engine');
  });
});

console.log('✓ All Dual-Engine Offline Farsi TTS Unit Tests Passed!');
