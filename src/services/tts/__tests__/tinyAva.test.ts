import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TINY_AVA_BOS,
  TINY_AVA_EOS,
  TINY_AVA_SP,
  TINY_AVA_SAMPLE_RATE,
  TINY_AVA_V2_SYMBOLS,
  TINY_AVA_SYMBOL_TO_ID,
  normalizePersianForTinyAva,
  splitTinyAvaSentences,
  splitPunctChunks,
  splitLangSpans,
  byt5Encode,
  byt5Decode,
  repr1ToWords,
  parseEnglishLexicon,
  englishToWords,
  phonemizeTinyAvaSentence,
  limitPeak,
  mapTinyAvaVoiceToId,
  pitchRatioToSemitones,
} from '../tinyAvaFrontend';
import { TinyAvaEngine } from '../tinyAvaEngine';
import { farsiOfflineTts } from '../farsiOfflineTTS';
import { validateWavBuffer } from '../audioUtils';

class MockTensor {
  public type: string;
  public data: any;
  public dims: number[];
  constructor(type: string, data: any, dims: number[]) {
    this.type = type;
    this.data = data;
    this.dims = dims;
  }
}

function makeGreedyDecoderSession(outputText: string) {
  const bytes = Array.from(new TextEncoder().encode(outputText));
  // ByT5 token IDs = byte + 3, terminated by EOS = 1
  const sequence = [...bytes.map((b) => b + 3), 1];
  const vocab = 260;

  return {
    async run(feeds: Record<string, MockTensor>) {
      const decLen = feeds.decoder_input_ids.dims[1];
      const stepIndex = decLen - 1;
      const targetId = sequence[Math.min(stepIndex, sequence.length - 1)];
      const logits = new Float32Array(decLen * vocab);
      logits[stepIndex * vocab + targetId] = 10.0;
      return {
        logits: new MockTensor('float32', logits, [1, decLen, vocab]),
      };
    },
  };
}

test('normalizePersianForTinyAva preserves short vowels & shadda, strips tanween/sukun, normalizes characters & ZWNJ', () => {
  // Short vowels (fatha/kasra/damma) & shadda must survive for homograph/ezafe disambiguation
  const withVowels = normalizePersianForTinyAva('گُلِ مُحَمَّد');
  assert.ok(withVowels.includes('\u064f'), 'damma preserved');
  assert.ok(withVowels.includes('\u0650'), 'kasra preserved');
  assert.ok(withVowels.includes('\u064e'), 'fatha preserved');
  assert.ok(withVowels.includes('\u0651'), 'shadda preserved');

  // Tanween & sukun are stripped
  const withTanween = normalizePersianForTinyAva('لطفاً کِتابْ');
  assert.ok(!withTanween.includes('\u064b'), 'fathatan stripped');
  assert.ok(!withTanween.includes('\u0652'), 'sukun stripped');

  // Arabic letter mapping matches persian-g2p-tiny training (ة/ۀ -> ه, ٱ -> ا)
  assert.equal(normalizePersianForTinyAva('مدرسة خانۀ ٱلف'), 'مدرسه خانه الف');

  // Em-dash and ellipsis preserved for tiny-ava-v2.json SYMBOLS
  assert.equal(normalizePersianForTinyAva('سلام... خوبی -- بله؟'), 'سلام… خوبی — بله?');

  // Safe ZWNJ insertion and decimal reading
  assert.equal(normalizePersianForTinyAva('می روم کتابها ۳.۱۴'), 'می\u200cروم کتاب\u200cها ۳ ممیز ۱۴');
});

test('splitPunctChunks keeps decimals intact and splitLangSpans separates Persian and English', () => {
  const chunks = splitPunctChunks('قیمت 3.14، و ۵.۲ است.');
  assert.ok(chunks.some(([isP, v]) => !isP && v.includes('3.14')));
  assert.ok(chunks.some(([isP, v]) => !isP && v.includes('۵.۲')));
  assert.ok(chunks.some(([isP, v]) => isP && v === '.'));

  const spans = splitLangSpans('سلام OpenAI دنیا');
  assert.deepEqual(spans, [
    ['fa', 'سلام'],
    ['en', 'OpenAI'],
    ['fa', 'دنیا'],
  ]);
});

test('byt5Encode and byt5Decode round-trip Persian UTF-8 text accurately', () => {
  const sample = 'سلام، دنیای هوش مصنوعی!';
  const encoded = byt5Encode(sample);
  assert.equal(encoded[encoded.length - 1], 1n, 'ends with ByT5 EOS token 1');

  const decoded = byt5Decode(Array.from(encoded.slice(0, -1), (n) => Number(n)));
  assert.equal(decoded, sample);
});

test('repr1ToWords converts persian-g2p-tiny output with zh->ʒ, initial glottal drop, and ezafe stress', () => {
  // Initial '?' before vowel is dropped; 'zh' becomes 'ʒ'; final stem vowel gets stress 1; ezafe '-e' gets stress 2
  const words = repr1ToWords('?Ab-e zhest');
  assert.equal(words.length, 2);

  // First word: ?Ab-e -> [ɑ(1), b(0), e(2)]
  assert.deepEqual(words[0], [
    ['ɑ', 1],
    ['b', 0],
    ['e', 2],
  ]);

  // Second word: zhest -> [ʒ(0), e(1), s(0), t(0)]
  assert.deepEqual(words[1], [
    ['ʒ', 0],
    ['e', 1],
    ['s', 0],
    ['t', 0],
  ]);
});

test('phonemizeTinyAvaSentence produces aligned bilingual symbols, IDs, and stress vectors', async () => {
  const enLex = parseEnglishLexicon('hello\th ə l ˈoʊ\nworld\tw ˈɜː l d\n');
  const enWords = englishToWords('Hello AI', enLex);
  assert.equal(enWords.length, 2);

  const res = await phonemizeTinyAvaSentence(
    'سلام hello!',
    async () => 'salAm',
    enLex
  );

  assert.ok(res);
  assert.equal(res.syms[0], TINY_AVA_BOS);
  assert.equal(res.syms[res.syms.length - 1], TINY_AVA_EOS);
  assert.ok(res.syms.includes(TINY_AVA_SP), 'includes word boundary <sp>');
  assert.ok(res.syms.includes('!'), 'includes exclamation punctuation');
  assert.equal(res.ids.length, res.syms.length);
  assert.equal(res.stress.length, res.syms.length);
  assert.equal(res.ids[0], TINY_AVA_SYMBOL_TO_ID[TINY_AVA_BOS]);
  assert.equal(TINY_AVA_V2_SYMBOLS.length, 84);
});

test('voice mapping, pitch semitones, sentence splitting, and peak limiter behave as expected', () => {
  assert.equal(mapTinyAvaVoiceToId('parisa'), 0);
  assert.equal(mapTinyAvaVoiceToId('mana'), 2);
  assert.equal(mapTinyAvaVoiceToId('maya'), 3);
  assert.equal(mapTinyAvaVoiceToId('unknown'), 0);

  assert.equal(pitchRatioToSemitones(1.0), 0);
  assert.ok(pitchRatioToSemitones(1.25) > 0);
  assert.ok(pitchRatioToSemitones(0.8) < 0);

  const longText = 'این جمله اول است و به اندازه کافی طولانی است. ' + 'کلمه '.repeat(30);
  const sents = splitTinyAvaSentences(longText);
  assert.ok(sents.length >= 2);
  for (const s of sents) {
    assert.ok(s.length <= 105, `Sentence chunk reasonably bounded: ${s.length}`);
  }

  const clipped = limitPeak(new Float32Array([0.5, -2.0, 1.5]));
  let maxAbs = 0;
  for (let i = 0; i < clipped.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(clipped[i]));
  }
  assert.ok(maxAbs <= 0.9901 && maxAbs >= 0.989);
});

test('TinyAvaEngine.synthesizeDirect emits exact ONNX feeds for Parisa, Mana, and Maya and produces valid 24kHz WAV', async () => {
  const engine = new TinyAvaEngine();
  const capturedFeeds: Array<Record<string, MockTensor>> = [];

  const mockEnc = {
    async run() {
      return { encoder_hidden_states: new MockTensor('float32', new Float32Array(8), [1, 2, 4]) };
    },
  };
  const mockDec = makeGreedyDecoderSession('salAm');
  const mockTts = {
    outputNames: ['audio'],
    async run(feeds: Record<string, MockTensor>) {
      capturedFeeds.push(feeds);
      // Produce 0.1s of 24kHz sine wave with amplitude > 1.0 to verify peak limiting
      const n = 2400;
      const audio = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        audio[i] = 1.5 * Math.sin((2 * Math.PI * 440 * i) / TINY_AVA_SAMPLE_RATE);
      }
      return { audio: new MockTensor('float32', audio, [1, n]) };
    },
  };

  engine.setSessionsForTesting({
    g2pEncSession: mockEnc,
    g2pDecSession: mockDec,
    ttsSession: mockTts,
    enLexicon: parseEnglishLexicon('focus\tf ˈoʊ k ə s\n'),
    ortOverride: { Tensor: MockTensor },
  });

  // 1. Default voice -> Parisa (0n)
  const parisaRes = await engine.synthesizeDirect('سلام', { speed: 1.15, pitch: 1.0 });
  assert.equal(parisaRes.success, true);
  assert.equal(parisaRes.sampleRate, 24000);
  assert.ok(parisaRes.wavBlob);

  const wavBytes = await parisaRes.wavBlob.arrayBuffer();
  const validation = validateWavBuffer(wavBytes);
  assert.equal(validation.valid, true, validation.error);
  assert.equal(validation.sampleRate, 24000);
  assert.equal(validation.numChannels, 1);

  const firstFeed = capturedFeeds[0];
  assert.deepEqual(
    Object.keys(firstFeed).sort(),
    ['pitch_range', 'pitch_shift', 'speed', 'stress', 'tokens', 'voice']
  );
  assert.equal(firstFeed.voice.data[0], 0n, 'Parisa maps to voice ID 0');
  assert.ok(Math.abs(firstFeed.speed.data[0] - 1.15) < 1e-5);
  assert.equal(firstFeed.pitch_shift.data[0], 0);

  // 2. Mana -> voice ID 2n
  const manaRes = await engine.synthesizeDirect('سلام', { voice: 'mana', pitch: 1.2 });
  assert.equal(manaRes.success, true);
  assert.equal(capturedFeeds[1].voice.data[0], 2n, 'Mana maps to voice ID 2');
  assert.ok(capturedFeeds[1].pitch_shift.data[0] > 0);

  // 3. Maya -> voice ID 3n (en_f2)
  const mayaRes = await engine.synthesizeDirect('focus', { voice: 'maya' });
  assert.equal(mayaRes.success, true);
  assert.equal(capturedFeeds[2].voice.data[0], 3n, 'Maya maps to voice ID 3');

  engine.resetForTesting();
});

test('farsiOfflineTts routes tiny-ava uncached fallback cleanly and respects allowFallback=false', async () => {
  farsiOfflineTts.resetForTesting();

  // When allowFallback is false and IndexedDB is absent in Node, tiny-ava must report failure honestly
  const noFallback = await farsiOfflineTts.synthesize('سلام دنیا', {
    engine: 'tiny-ava',
    voice: 'parisa',
    allowFallback: false,
  });
  assert.equal(noFallback.success, false);
  assert.equal(noFallback.engineUsed, 'tiny-ava');

  // Voice getter/setter persists in manager state
  farsiOfflineTts.setTinyAvaVoice('mana');
  assert.equal(farsiOfflineTts.getTinyAvaVoice(), 'mana');
  farsiOfflineTts.setTinyAvaVoice('parisa');
  assert.equal(farsiOfflineTts.getTinyAvaVoice(), 'parisa');
});

test('tinyAvaModelCache downloads core Parisa & extra voice assets into tiny-ava-models-v1 with byte-level progress and serves cache hits offline', async () => {
  const {
    TINY_AVA_CACHE_NAME,
    TINY_AVA_CORE_ASSETS,
    ensureTinyAvaModelsCached,
    getCachedTinyAvaAsset,
    isTinyAvaCacheReady,
    clearTinyAvaModelCache,
  } = await import('../tinyAvaModelCache');

  assert.equal(TINY_AVA_CACHE_NAME, 'tiny-ava-models-v1');
  assert.deepEqual(
    TINY_AVA_CORE_ASSETS.map((a) => a.name),
    ['g2p_encoder.onnx', 'g2p_decoder.onnx', 'tiny-ava-parisa.onnx', 'tiny-ava-parisa.json']
  );

  // Minimal in-memory CacheStorage mock implementing open/match/put/delete
  const buckets = new Map<string, Map<string, Response>>();
  const mockCacheStorage = {
    async open(name: string) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const store = buckets.get(name)!;
      return {
        async match(req: RequestInfo | URL) {
          const key = typeof req === 'string' ? req : req.toString();
          const hit = store.get(key);
          return hit ? hit.clone() : undefined;
        },
        async put(req: RequestInfo | URL, res: Response) {
          const key = typeof req === 'string' ? req : req.toString();
          store.set(key, res.clone());
        },
        async delete(req: RequestInfo | URL) {
          const key = typeof req === 'string' ? req : req.toString();
          return store.delete(key);
        },
      };
    },
    async delete(name: string) {
      return buckets.delete(name);
    },
  } as unknown as CacheStorage;

  const extraVoiceAsset = {
    name: 'tiny-ava-mana.json',
    url: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-mana.json',
    kind: 'json' as const,
    expectedBytes: 120,
    minBytes: 20,
  };

  let fetchCalls = 0;
  const mockFetch = (async (input: RequestInfo | URL) => {
    fetchCalls += 1;
    const url = String(input);
    const isJson = url.endsWith('.json');
    const payload = isJson
      ? new TextEncoder().encode(JSON.stringify({ sample_rate: 24000, voices: ['parisa'], symbols: ['<pad>'], pad: 'x'.repeat(120) }))
      : new Uint8Array(120_000).fill(7);

    // Stream payload in 2 chunks to verify byte-level progress callbacks
    const splitAt = Math.floor(payload.byteLength / 2);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(payload.slice(0, splitAt));
        controller.enqueue(payload.slice(splitAt));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Length': String(payload.byteLength) },
    });
  }) as typeof fetch;

  assert.equal(
    await isTinyAvaCacheReady({ extraAssets: [extraVoiceAsset], cacheStorage: mockCacheStorage }),
    false
  );

  const progressEvents: Array<{ file: string; fileLoadedBytes: number; totalLoadedBytes: number; percent: number; cached: boolean }> = [];
  const firstRun = await ensureTinyAvaModelsCached({
    extraAssets: [extraVoiceAsset],
    cacheStorage: mockCacheStorage,
    fetchImpl: mockFetch,
    onProgress: (p) => progressEvents.push(p),
  });

  assert.equal(fetchCalls, 5, 'fetches all 4 core Parisa assets + 1 extra asset');
  assert.ok(firstRun['g2p_encoder.onnx'].byteLength === 120_000);
  assert.ok(firstRun['g2p_decoder.onnx'].byteLength === 120_000);
  assert.ok(firstRun['tiny-ava-parisa.onnx'].byteLength === 120_000);
  assert.ok(firstRun['tiny-ava-parisa.json'].byteLength > 100);
  assert.ok(firstRun['tiny-ava-mana.json'].byteLength > 100);
  assert.ok(progressEvents.length >= 10, 'emits chunk-level byte progress callbacks');
  assert.equal(progressEvents[progressEvents.length - 1].percent, 100);
  assert.ok(
    progressEvents.every((ev, i) => i === 0 || ev.totalLoadedBytes >= progressEvents[i - 1].totalLoadedBytes),
    'totalLoadedBytes increases monotonically'
  );
  assert.equal(
    await isTinyAvaCacheReady({ extraAssets: [extraVoiceAsset], cacheStorage: mockCacheStorage }),
    true
  );

  // Second run must satisfy all 5 assets from tiny-ava-models-v1 without any network calls
  fetchCalls = 0;
  const cachedEvents: boolean[] = [];
  await ensureTinyAvaModelsCached({
    extraAssets: [extraVoiceAsset],
    cacheStorage: mockCacheStorage,
    fetchImpl: mockFetch,
    onProgress: (p) => cachedEvents.push(p.cached),
  });
  assert.equal(fetchCalls, 0, 'zero network calls on cache hit');
  assert.ok(cachedEvents.length >= 5 && cachedEvents.every(Boolean));

  const hit = await getCachedTinyAvaAsset('tiny-ava-parisa.onnx', mockCacheStorage);
  assert.ok(hit && hit.byteLength === 120_000);

  assert.equal(await clearTinyAvaModelCache(mockCacheStorage), true);
  assert.equal(await isTinyAvaCacheReady({ cacheStorage: mockCacheStorage }), false);
});

test('MV3 manifest declares wasm-unsafe-eval CSP, Hugging Face host_permissions, and wasm/* resources', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.ok(
    manifest.content_security_policy?.extension_pages?.includes("'wasm-unsafe-eval'"),
    'extension_pages CSP must include wasm-unsafe-eval'
  );
  assert.ok(
    Array.isArray(manifest.host_permissions) &&
      manifest.host_permissions.includes('https://huggingface.co/*') &&
      manifest.host_permissions.includes('https://*.hf.co/*'),
    'host_permissions must include Hugging Face domains'
  );
  assert.ok(
    manifest.web_accessible_resources?.[0]?.resources?.includes('wasm/*'),
    'web_accessible_resources must expose wasm/*'
  );
});

test('Phase 3: 46-symbol tiny-ava-parisa.json table maps Persian punctuation, diacritics, ZWNJ, and 3-class stress/ezafe', async () => {
  const {
    TINY_AVA_PARISA_46_SYMBOLS,
    TINY_AVA_PARISA_SYMBOL_TO_ID,
    TINY_AVA_PARISA_PHONE_SET,
  } = await import('../tinyAvaFrontend');

  assert.equal(TINY_AVA_PARISA_46_SYMBOLS.length, 46);
  const res = await phonemizeTinyAvaSentence(
    'گُلِ سرخ، خوب است؟',
    async (span) => {
      // Confirm diacritics (damma/kasra) survived normalization into G2P input
      if (span.includes('گ')) {
        assert.ok(span.includes('\u064f') && span.includes('\u0650'));
        return 'gol-e sorx';
      }
      return 'xub ?ast';
    },
    new Map(),
    TINY_AVA_PARISA_SYMBOL_TO_ID,
    TINY_AVA_PARISA_PHONE_SET
  );

  assert.ok(res);
  assert.ok(res.syms.includes('،'), 'uses Persian comma in 46-symbol Parisa table');
  assert.ok(res.syms.includes('؟'), 'uses Persian question mark in 46-symbol Parisa table');
  // Verify all 3 stress classes exist: 0 (unstressed), 1 (primary stem stress), 2 (explicit ezafe)
  assert.ok(res.stress.includes(0));
  assert.ok(res.stress.includes(1));
  assert.ok(res.stress.includes(2));
  assert.equal(res.ids.length, res.syms.length);
  assert.equal(res.stress.length, res.syms.length);
});

test('Phase 3: TinyAvaEngine lazy-loads 3 ORT sessions from Cache API, streams 24kHz Web Audio utterances, and halts cleanly on abort()', async () => {
  const engine = new TinyAvaEngine();

  // In-memory CacheStorage mock
  const buckets = new Map<string, Map<string, Response>>();
  const mockCacheStorage = {
    async open(name: string) {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const store = buckets.get(name)!;
      return {
        async match(req: RequestInfo | URL) {
          const hit = store.get(String(req));
          return hit ? hit.clone() : undefined;
        },
        async put(req: RequestInfo | URL, res: Response) {
          store.set(String(req), res.clone());
        },
        async delete(req: RequestInfo | URL) {
          return store.delete(String(req));
        },
      };
    },
    async delete(name: string) {
      return buckets.delete(name);
    },
  } as unknown as CacheStorage;

  const fs = await import('node:fs');
  const path = await import('node:path');
  const parisaJsonText = fs.readFileSync(path.resolve(process.cwd(), 'public/tiny-ava-parisa.json'), 'utf8');

  const mockFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const bytes = url.endsWith('.json')
      ? new TextEncoder().encode(parisaJsonText)
      : new Uint8Array(120_000).fill(3);
    return new Response(bytes, { status: 200, headers: { 'Content-Length': String(bytes.byteLength) } });
  }) as typeof fetch;

  let createdSessionCount = 0;
  let ttsInferenceCalls = 0;
  const mockDec = makeGreedyDecoderSession('salAm');
  const mockOrt = {
    Tensor: MockTensor,
    InferenceSession: {
      async create() {
        createdSessionCount += 1;
        if (createdSessionCount === 1) {
          return {
            async run() {
              return { encoder_hidden_states: new MockTensor('float32', new Float32Array(8), [1, 2, 4]) };
            },
          };
        }
        if (createdSessionCount === 2) {
          return mockDec;
        }
        return {
          outputNames: ['audio'],
          async run() {
            ttsInferenceCalls += 1;
            const pcm = new Float32Array(1200);
            pcm[10] = 1.8; // Exceeds 0.99 to verify peak normalization
            return { audio: new MockTensor('float32', pcm, [1, pcm.length]) };
          },
        };
      },
    },
  };

  // Mock 24 kHz Web Audio AudioContext to verify sampleRate = 24000 and reference release
  const createdBufferRates: number[] = [];
  let activeSourceStopped = false;
  let releasedBuffer = false;
  const mockAudioContext = {
    state: 'running',
    destination: {},
    createBuffer(channels: number, length: number, sampleRate: number) {
      createdBufferRates.push(sampleRate);
      const data = new Float32Array(length);
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        copyToChannel(src: Float32Array) {
          data.set(src);
        },
        getChannelData() {
          return data;
        },
      };
    },
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    },
    createBufferSource() {
      let _buf: any = null;
      const src: any = {
        get buffer() { return _buf; },
        set buffer(v: any) {
          if (v === null && _buf !== null) releasedBuffer = true;
          _buf = v;
        },
        onended: null as null | (() => void),
        connect() {},
        disconnect() {},
        start() {
          setTimeout(() => {
            if (src.onended) src.onended();
          }, 5);
        },
        stop() {
          activeSourceStopped = true;
        },
      };
      return src;
    },
  } as unknown as AudioContext;

  engine.setSessionsForTesting({
    ortOverride: mockOrt,
    cacheStorageOverride: mockCacheStorage,
    fetchOverride: mockFetch,
    audioContextOverride: mockAudioContext,
  });

  const progressSeen: number[] = [];
  let started = false;
  let ended = false;
  await engine.speak('جمله اول. جمله دوم.', {
    voice: 'parisa',
    onDownloadProgress: (p) => progressSeen.push(p.percent),
    onStart: () => { started = true; },
    onEnd: () => { ended = true; },
  });

  assert.equal(createdSessionCount, 3, 'lazy-loads exactly 3 ONNX sessions (g2p_enc, g2p_dec, tiny-ava-parisa)');
  assert.ok(progressSeen.length > 0 && progressSeen[progressSeen.length - 1] === 100);
  assert.equal(ttsInferenceCalls, 2, 'synthesizes both sentences utterance-by-utterance');
  assert.deepEqual(createdBufferRates, [24000, 24000], 'plays every sentence at sampleRate = 24000');
  assert.equal(started, true);
  assert.equal(ended, true);
  assert.equal(releasedBuffer, true, 'releases AudioBuffer references after playback');

  // Verify abort() immediately halts queued sentences
  ttsInferenceCalls = 0;
  const yielded: number[] = [];
  for await (const chunk of engine.synthesizeUtterances('اول. دوم. سوم.', { voice: 'parisa' })) {
    yielded.push(chunk.index);
    let peak = 0;
    for (let i = 0; i < chunk.pcm.length; i++) peak = Math.max(peak, Math.abs(chunk.pcm[i]));
    assert.ok(peak <= 0.9901, 'output waveform is peak-normalized <= 0.99');
    engine.abort();
  }
  assert.deepEqual(yielded, [0], 'abort() immediately stops queued sentences after first chunk');
  assert.equal(ttsInferenceCalls, 1, 'never synthesizes queued sentences after abort()');
  assert.equal(engine.isSpeaking(), false);
  assert.equal(activeSourceStopped, false);

  engine.resetForTesting();
});


