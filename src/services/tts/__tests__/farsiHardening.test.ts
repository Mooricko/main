import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  normalizePersianText,
  splitIntoSentences,
} from '../phonemizer/persianNormalizer';
import { CustomTtsEngine } from '../customTtsEngine';
import { validateCustomTtsConfig } from '../customTtsConfig';

describe('Normalizer hardening', () => {
  it('keeps standalone hamza (جزء, مسئله) instead of corrupting it to ye-hamza', () => {
    assert.strictEqual(normalizePersianText('جزء'), 'جزء');
    assert.strictEqual(normalizePersianText('مسئله'), 'مسئله');
  });

  it('does not split nouns that merely start with "می"', () => {
    for (const noun of ['میوه', 'میز', 'میدان', 'میراث', 'میلیون', 'میخانه']) {
      assert.strictEqual(normalizePersianText(noun), noun, `${noun} must stay intact`);
    }
  });

  it('still splits actual present-tense می/نمی verbs', () => {
    assert.strictEqual(normalizePersianText('میروم'), 'می‌روم');
    assert.strictEqual(normalizePersianText('میتوانم'), 'می‌توانم');
    assert.strictEqual(normalizePersianText('نمیدانم'), 'نمی‌دانم');
    assert.strictEqual(normalizePersianText('میدانم'), 'می‌دانم');
  });

  it('does not split comparative/lexical تر words', () => {
    for (const w of ['دختر', 'دکتر', 'کیلومتر', 'بزرگتر', 'بهتر', 'برادر']) {
      assert.strictEqual(normalizePersianText(w), w, `${w} must stay intact`);
    }
  });

  it('expands a decimal separator between digits to "ممیز"', () => {
    assert.strictEqual(normalizePersianText('نسخه 2.0'), 'نسخه 2 ممیز 0');
    assert.strictEqual(normalizePersianText('۰.۵'), '۰ ممیز ۵');
    // A period that is not between digits is left alone (sentence end).
    assert.strictEqual(normalizePersianText('سلام. دنیا'), 'سلام. دنیا');
  });
});

describe('splitIntoSentences', () => {
  it('splits on sentence terminators and keeps them attached', () => {
    assert.deepStrictEqual(splitIntoSentences('سلام دنیا. جمله دوم؟ جمله سوم!'), [
      'سلام دنیا.',
      'جمله دوم؟',
      'جمله سوم!',
    ]);
  });

  it('splits overly long sentences on clause boundaries', () => {
    const long = 'یک جملهٔ خیلی طولانی، با چند ویرگول، که باید، برای مدل پیپر، به چند بخش شکسته شود و ادامه دارد';
    const parts = splitIntoSentences(long, 40);
    assert.ok(parts.length > 1, 'long sentence should be split');
    for (const p of parts) assert.ok(p.length <= 40 + 20, `part too long: ${p.length}`);
  });
});

describe('Custom TTS config validation', () => {
  it('rejects non-https public endpoints', () => {
    const r = validateCustomTtsConfig({ baseUrl: 'http://example.com/v1', apiKey: 'k', model: 'm', voice: 'v' });
    assert.strictEqual(r.valid, false);
    assert.match(r.error!, /https/);
  });

  it('allows http only for localhost / private hosts', () => {
    assert.strictEqual(validateCustomTtsConfig({ baseUrl: 'http://localhost:8080/v1', model: 'm', voice: 'v' }).valid, true);
    assert.strictEqual(validateCustomTtsConfig({ baseUrl: 'http://127.0.0.1:8080/v1', model: 'm', voice: 'v' }).valid, true);
    assert.strictEqual(validateCustomTtsConfig({ baseUrl: 'http://192.168.1.10/v1', model: 'm', voice: 'v' }).valid, true);
  });

  it('rejects credentials embedded in the URL', () => {
    const r = validateCustomTtsConfig({ baseUrl: 'https://user:pass@example.com/v1', apiKey: '', model: 'm', voice: 'v' });
    assert.strictEqual(r.valid, false);
  });
});

describe('CustomTtsEngine', () => {
  function wavBytes(): ArrayBuffer {
    // minimal RIFF/WAVE with a little data
    const data = 64;
    const buf = new ArrayBuffer(44 + data);
    const v = new DataView(buf);
    const w = (s: string, o: number) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w('RIFF', 0); v.setUint32(4, 36 + data, true); w('WAVE', 8); w('fmt ', 12);
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 24000, true); v.setUint32(28, 24000 * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w('data', 36); v.setUint32(40, data, true);
    return buf;
  }

  it('posts to {baseUrl}/audio/speech with a Bearer key and returns audio', async () => {
    const engine = new CustomTtsEngine();
    engine.setConfigOverride({ baseUrl: 'https://api.example.com/v1', apiKey: 'sk-secret', model: 'tts-1', voice: 'alloy', format: 'wav' });

    let captured: { url: string; headers: Record<string, string>; body: any } | null = null;
    engine.setFetcherForTesting(async (url, init) => {
      captured = { url: String(url), headers: (init?.headers || {}) as Record<string, string>, body: JSON.parse(String(init?.body || '{}')) };
      return new Response(wavBytes(), { status: 200, headers: { 'content-type': 'audio/wav' } });
    });

    const res = await engine.synthesize('سلام دنیا', {});
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.engineUsed, 'custom');
    assert.strictEqual(captured!.url, 'https://api.example.com/v1/audio/speech');
    assert.strictEqual(captured!.headers['Authorization'], 'Bearer sk-secret');
    assert.strictEqual(captured!.body.model, 'tts-1');
    assert.strictEqual(captured!.body.voice, 'alloy');
    assert.ok(res.wavBlob.size > 44);
  });

  it('does not send a request when unconfigured', async () => {
    const engine = new CustomTtsEngine();
    engine.setConfigOverride(null);
    let called = false;
    engine.setFetcherForTesting(async () => { called = true; return new Response(); });
    const res = await engine.synthesize('سلام', {});
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCategory, 'NOT_CONFIGURED');
    assert.strictEqual(called, false);
  });

  it('classifies 401 as auth failure and never echoes the key', async () => {
    const engine = new CustomTtsEngine();
    engine.setConfigOverride({ baseUrl: 'https://api.example.com/v1', apiKey: 'sk-secret', model: 'm', voice: 'v' });
    engine.setFetcherForTesting(async () => new Response('bad key sk-secret', { status: 401 }));
    const res = await engine.synthesize('سلام', {});
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCategory, 'AUTH_FAILED');
    assert.ok(!(res.error || '').includes('sk-secret'), 'error must scrub the key');
  });
});
