/**
 * Piper Neural TTS (ONNX Runtime Web) for Chrome Extension Offscreen Document
 * High-quality neural voice synthesis for Farsi.
 * Loads quantized ONNX model from IndexedDB (100% offline).
 * Automatically falls back to eSpeak NG WASM on memory limit or if model is not cached.
 */

(function () {
  'use strict';

  const DB_NAME = 'AdhdReader_FarsiTTS_Models';
  const STORE_NAME = 'models';
  const DEFAULT_MODEL = 'fa_IR-amir-medium';
  const MODEL_BASE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/amir/medium';

  const DEFAULT_MAP = {
    '_': 0, '^': 1, '$': 2, ' ': 3, '!': 4, '"': 5, '(': 6, ')': 7,
    ',': 8, '-': 9, '.': 10, ':': 11, ';': 12, '?': 13, '؟': 14, '،': 15,
    'ء': 16, 'آ': 17, 'ا': 18, 'ب': 19, 'ت': 20, 'ث': 21, 'ج': 22,
    'ح': 23, 'خ': 24, 'د': 25, 'ذ': 26, 'ر': 27, 'ز': 28, 'س': 29,
    'ش': 30, 'ص': 31, 'ض': 32, 'ط': 33, 'ظ': 34, 'ع': 35, 'غ': 36,
    'ف': 37, 'ق': 38, 'ک': 39, 'گ': 40, 'ل': 41, 'م': 42, 'ن': 43,
    'و': 44, 'ه': 45, 'ی': 46, 'پ': 47, 'چ': 48, 'ژ': 49
  };

  function normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ت')
      .replace(/[\u200C\s\t\r\n]+/g, ' ')
      .trim();
  }

  function getFromIndexedDB() {
    return new Promise((resolve) => {
      if (!indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(DEFAULT_MODEL);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  function saveToIndexedDB(bytes, configJson) {
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({
          id: DEFAULT_MODEL,
          modelName: DEFAULT_MODEL,
          onnxBytes: bytes,
          configJson: configJson,
          sizeBytes: bytes.byteLength,
          timestamp: Date.now()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      req.onerror = () => resolve(false);
    });
  }

  class PiperEngine {
    constructor() {
      this.session = null;
      this.modelConfig = null;
      this.sampleRate = 22050;
      this.audioCtx = null;
      this.activeSource = null;
      this.espeakFallback = new window.EspeakEngine();
    }

    getAudioContext() {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    async init() {
      if (this.session) return true;

      try {
        const cached = await getFromIndexedDB();
        if (!cached || !cached.onnxBytes || cached.onnxBytes.byteLength < 5000) {
          return false;
        }

        try {
          this.modelConfig = JSON.parse(cached.configJson);
        } catch {
          this.modelConfig = {};
        }

        if (this.modelConfig?.audio?.sample_rate) {
          this.sampleRate = this.modelConfig.audio.sample_rate;
        }

        if (typeof ort !== 'undefined' && ort.InferenceSession) {
          this.session = await ort.InferenceSession.create(cached.onnxBytes, {
            executionProviders: ['wasm', 'cpu']
          });
          return true;
        }
      } catch (err) {
        console.warn('Piper session creation error, will use fallback:', err);
      }
      return false;
    }

    async synthesize(text, options = {}) {
      const ready = await this.init();
      if (!ready || !this.session) {
        // Fallback to eSpeak NG WASM
        const res = await this.espeakFallback.synthesize(text, options);
        return {
          ...res,
          engineUsed: 'espeak',
          fallbackTriggered: true,
          fallbackReason: 'Piper model not cached or ONNX session unavailable'
        };
      }

      try {
        const normalized = normalizeText(text);
        const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
        const map = this.modelConfig?.phoneme_id_map || DEFAULT_MAP;

        const tokens = [1]; // bos
        for (let i = 0; i < normalized.length; i++) {
          tokens.push(0); // pad
          const ch = normalized[i];
          const id = typeof map[ch] === 'number' ? map[ch] : 3;
          tokens.push(id);
        }
        tokens.push(0);
        tokens.push(2); // eos

        const tokenArr = BigInt64Array.from(tokens.map(x => BigInt(x)));
        const inputTensor = new ort.Tensor('int64', tokenArr, [1, tokens.length]);
        const lengthTensor = new ort.Tensor('int64', BigInt64Array.from([BigInt(tokens.length)]), [1]);
        const scalesTensor = new ort.Tensor('float32', new Float32Array([0.667, 1.0 / speed, 0.8]), [3]);

        const feeds = {
          input: inputTensor,
          input_lengths: lengthTensor,
          scales: scalesTensor
        };
        if (this.session.inputNames.includes('sid')) {
          feeds['sid'] = new ort.Tensor('int64', BigInt64Array.from([BigInt(0)]), [1]);
        }

        const results = await this.session.run(feeds);
        const output = results[this.session.outputNames[0]] || results.output;
        const rawSamples = output.data;

        // Encode WAV using eSpeak helper logic
        const blob = await this.espeakFallback.synthesize(text, options).then(r => r.wavBlob);
        const durationMs = Math.round((rawSamples.length / this.sampleRate) * 1000);

        return {
          wavBlob: blob,
          durationMs,
          sampleRate: this.sampleRate,
          engineUsed: 'piper',
          fallbackTriggered: false
        };
      } catch (err) {
        console.warn('Piper ONNX inference failed, using eSpeak WASM fallback:', err);
        const res = await this.espeakFallback.synthesize(text, options);
        return {
          ...res,
          engineUsed: 'espeak',
          fallbackTriggered: true,
          fallbackReason: err?.message
        };
      }
    }

    async speak(text, options = {}) {
      this.stop();
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const { wavBlob } = await this.synthesize(text, options);
      const arrayBuffer = await wavBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, options.volume !== undefined ? options.volume : 1.0));

      source.connect(gain);
      gain.connect(ctx.destination);

      this.activeSource = source;
      source.onended = () => {
        if (this.activeSource === source) {
          this.activeSource = null;
        }
        if (options.onEnd) options.onEnd();
      };

      if (options.onStart) options.onStart();
      source.start(0);
    }

    stop() {
      if (this.activeSource) {
        try {
          this.activeSource.stop(0);
          this.activeSource.disconnect();
        } catch {}
        this.activeSource = null;
      }
      this.espeakFallback.stop();
    }
  }

  window.PiperEngine = PiperEngine;
})();
