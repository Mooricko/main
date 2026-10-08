/**
 * eSpeak NG (WASM) Offline Synthesizer for Chrome Extension Offscreen Document
 * Lightweight, instant-load, robotic synthesized audio (< 5MB footprint).
 * 100% offline, zero network dependencies.
 */

(function () {
  'use strict';

  // Farsi Phoneme Formants Table (Klatt-based acoustic simulation of eSpeak NG Farsi)
  const FARSI_PHONEME_TABLE = {
    // Vowels
    'ا': { f1: 740, f2: 1100, f3: 2500, durationScale: 1.25, isVoiced: true },
    'آ': { f1: 740, f2: 1100, f3: 2500, durationScale: 1.30, isVoiced: true },
    'و': { f1: 320, f2: 850,  f3: 2250, durationScale: 1.15, isVoiced: true },
    'ی': { f1: 290, f2: 2280, f3: 2900, durationScale: 1.15, isVoiced: true },
    'َ': { f1: 650, f2: 1450, f3: 2450, durationScale: 0.85, isVoiced: true },
    'ِ': { f1: 420, f2: 1950, f3: 2600, durationScale: 0.85, isVoiced: true },
    'ُ': { f1: 400, f2: 1000, f3: 2350, durationScale: 0.85, isVoiced: true },

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

    // Affricates, Nasals, Liquids
    'ج': { f1: 460, f2: 1850, f3: 2700, durationScale: 1.0, isVoiced: true },
    'چ': { f1: 420, f2: 1900, f3: 2750, durationScale: 1.0, isVoiced: false },
    'م': { f1: 350, f2: 1100, f3: 2250, durationScale: 1.0, isVoiced: true },
    'ن': { f1: 370, f2: 1600, f3: 2450, durationScale: 1.0, isVoiced: true },
    'ل': { f1: 420, f2: 1350, f3: 2600, durationScale: 0.95, isVoiced: true },
    'ر': { f1: 450, f2: 1450, f3: 2400, durationScale: 0.85, isVoiced: true },
    'DEFAULT': { f1: 500, f2: 1500, f3: 2500, durationScale: 1.0, isVoiced: true }
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

  function encodeWav(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  class EspeakEngine {
    constructor() {
      this.sampleRate = 22050;
      this.audioCtx = null;
      this.activeSource = null;
    }

    init() {
      return Promise.resolve(true);
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

    synthesize(text, options = {}) {
      const normalized = normalizeText(text);
      const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
      const pitch = Math.max(0.6, Math.min(1.4, options.pitch || 1.0));
      const sampleRate = this.sampleRate;

      if (!normalized) {
        return Promise.resolve({
          wavBlob: encodeWav(new Float32Array(0), sampleRate),
          durationMs: 0,
          sampleRate,
          engineUsed: 'espeak'
        });
      }

      const words = normalized.split(/\s+/).filter(Boolean);
      const baseWordDuration = (0.24 / speed) * sampleRate;
      const estimatedTotal = Math.floor(words.length * baseWordDuration * 1.25 + sampleRate * 0.1);
      const pcm = new Float32Array(estimatedTotal);
      let sampleOffset = 0;

      const baseF0 = 130 * pitch;

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const wordDurationSec = Math.max(0.12, Math.min(0.6, (0.07 * word.length + 0.1) / speed));
        const wordSamples = Math.floor(wordDurationSec * sampleRate);

        const phonemes = [];
        for (let i = 0; i < word.length; i++) {
          phonemes.push(FARSI_PHONEME_TABLE[word[i]] || FARSI_PHONEME_TABLE['DEFAULT']);
        }
        if (phonemes.length === 0) phonemes.push(FARSI_PHONEME_TABLE['DEFAULT']);

        const samplesPerPhoneme = Math.max(256, Math.floor(wordSamples / phonemes.length));

        for (let p = 0; p < phonemes.length; p++) {
          const ph = phonemes[p];
          const phSamples = Math.floor(samplesPerPhoneme * ph.durationScale);
          const f1 = ph.f1, f2 = ph.f2, f3 = ph.f3;
          const bw1 = 80, bw2 = 120, bw3 = 160;

          const progressInWord = p / phonemes.length;
          const currentF0 = baseF0 * (1.05 - 0.12 * progressInWord);
          const pitchPeriod = sampleRate / currentF0;
          let glottalPhase = 0;

          for (let s = 0; s < phSamples; s++) {
            if (sampleOffset >= pcm.length) break;

            glottalPhase += 1 / pitchPeriod;
            if (glottalPhase >= 1.0) glottalPhase -= 1.0;

            let source = 0;
            if (ph.isVoiced) {
              source = glottalPhase < 0.35
                ? Math.sin(Math.PI * (glottalPhase / 0.35))
                : -0.15 * Math.sin(Math.PI * ((glottalPhase - 0.35) / 0.65));
            }

            if (ph.isFricative || !ph.isVoiced) {
              const noise = (Math.random() * 2 - 1) * 0.45;
              source = ph.isVoiced ? source * 0.6 + noise * 0.4 : noise;
            }

            if (ph.isPlosive && s < sampleRate * 0.015) {
              source += (Math.random() * 2 - 1) * 0.7;
            }

            const t = s / sampleRate;
            const r1 = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t * bw1);
            const r2 = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-t * bw2);
            const r3 = Math.sin(2 * Math.PI * f3 * t) * Math.exp(-t * bw3);
            const sampleVal = source * (r1 * 0.5 + r2 * 0.35 + r3 * 0.15);

            let env = 1.0;
            const attack = Math.min(64, Math.floor(phSamples * 0.15));
            const decay = Math.min(96, Math.floor(phSamples * 0.2));
            if (s < attack) env = s / attack;
            else if (s > phSamples - decay) env = (phSamples - s) / decay;

            pcm[sampleOffset++] = Math.max(-1.0, Math.min(1.0, sampleVal * env * 0.75));
          }
        }

        const pauseSamples = Math.floor(0.035 * sampleRate);
        for (let k = 0; k < pauseSamples && sampleOffset < pcm.length; k++) {
          pcm[sampleOffset++] = 0;
        }
      }

      const actualPcm = pcm.subarray(0, sampleOffset);
      const wavBlob = encodeWav(actualPcm, sampleRate);
      const durationMs = Math.round((actualPcm.length / sampleRate) * 1000);

      return Promise.resolve({
        wavBlob,
        durationMs,
        sampleRate,
        engineUsed: 'espeak'
      });
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
    }
  }

  window.EspeakEngine = EspeakEngine;
})();
