/**
 * Audio Utilities for Offline Farsi TTS (Piper ONNX & eSpeak NG WASM)
 * 
 * Provides:
 * 1. Robust Float32/Int16 PCM to RIFF WAV container encoding
 * 2. Proper mono 16-bit PCM formatting with clipping and Little-Endian byte ordering
 * 3. Piper ONNX output tensor sample extraction and validation
 * 4. WAV header validation and inspection
 */

export interface WavHeaderInfo {
  valid: boolean;
  numChannels?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  dataByteLength?: number;
  totalByteLength?: number;
  error?: string;
}

/**
 * Encodes Float32 or Int16 audio samples into a standard 16-bit PCM RIFF WAV ArrayBuffer.
 * Handles clipping to [-1.0, 1.0], sample rate configuration, and mono channel alignment.
 */
export function encodePcmWavBuffer(
  samples: Float32Array | Int16Array | number[],
  sampleRate: number = 22050
): ArrayBuffer {
  if (!samples) {
    throw new Error('WAV encoding failed: samples parameter is null or undefined');
  }

  if (typeof sampleRate !== 'number' || sampleRate <= 0 || !Number.isFinite(sampleRate)) {
    throw new Error(`WAV encoding failed: invalid sample rate (${sampleRate})`);
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8; // 2
  const blockAlign = numChannels * bytesPerSample; // 2
  const byteRate = sampleRate * blockAlign;
  const sampleCount = samples.length;
  const dataSize = sampleCount * bytesPerSample;
  const totalBufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(totalBufferSize);
  const view = new DataView(buffer);

  // 1. RIFF chunk descriptor
  // 0-3: 'RIFF'
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  // 4-7: ChunkSize = 36 + SubChunk2Size
  view.setUint32(4, 36 + dataSize, true);
  // 8-11: 'WAVE'
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // 2. fmt subchunk
  // 12-15: 'fmt '
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6d); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // space
  // 16-19: Subchunk1Size = 16 for PCM
  view.setUint32(16, 16, true);
  // 20-21: AudioFormat = 1 (linear PCM)
  view.setUint16(20, 1, true);
  // 22-23: NumChannels = 1 (mono)
  view.setUint16(22, numChannels, true);
  // 24-27: SampleRate
  view.setUint32(24, Math.round(sampleRate), true);
  // 28-31: ByteRate = SampleRate * NumChannels * BitsPerSample/8
  view.setUint32(28, Math.round(byteRate), true);
  // 32-33: BlockAlign = NumChannels * BitsPerSample/8
  view.setUint16(32, blockAlign, true);
  // 34-35: BitsPerSample = 16
  view.setUint16(34, bitsPerSample, true);

  // 3. data subchunk
  // 36-39: 'data'
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  // 40-43: Subchunk2Size
  view.setUint32(40, dataSize, true);

  // 4. PCM Samples writing (Float32 -> Int16 clamped to [-1.0, 1.0])
  let offset = 44;
  const isInt16Array = samples instanceof Int16Array;

  for (let i = 0; i < sampleCount; i++) {
    if (isInt16Array) {
      const s = (samples as Int16Array)[i];
      const clamped = Math.max(-32768, Math.min(32767, s));
      view.setInt16(offset, clamped, true);
    } else {
      const s = Number(samples[i]);
      // Strict clamping to [-1.0, 1.0] to prevent audio wrapping distortion
      const clamped = Math.max(-1.0, Math.min(1.0, isNaN(s) ? 0 : s));
      const intSample = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7FFF);
      view.setInt16(offset, intSample, true);
    }
    offset += 2;
  }

  return buffer;
}

/**
 * Creates a valid audio/wav Blob from raw audio samples.
 */
export function encodePcmWav(
  samples: Float32Array | Int16Array | number[],
  sampleRate: number = 22050
): Blob {
  const buffer = encodePcmWavBuffer(samples, sampleRate);
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Extracts and validates raw audio samples from a Piper ONNX output tensor.
 * Handles tensors of shapes:
 * - [audio_length]
 * - [1, audio_length]
 * - [1, 1, audio_length]
 * - multi-dimensional audio output
 */
export function extractPiperAudioSamples(outputTensor: any): Float32Array | Int16Array {
  if (!outputTensor) {
    throw new Error('Invalid Piper output tensor: output tensor is null or undefined');
  }

  const data = outputTensor.data;
  if (!data || typeof data.length !== 'number') {
    throw new Error('Invalid Piper output tensor: tensor data is missing or empty');
  }

  if (data.length === 0) {
    return new Float32Array(0);
  }

  // Float32Array (standard Piper VITS output)
  if (data instanceof Float32Array) {
    return data;
  }

  // Int16Array
  if (data instanceof Int16Array) {
    return data;
  }

  // Array or other typed array
  const floatArray = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    floatArray[i] = Number(data[i]);
  }
  return floatArray;
}

/**
 * Inspects a WAV ArrayBuffer and validates the RIFF PCM header
 */
export function validateWavBuffer(buffer: ArrayBuffer | Uint8Array): WavHeaderInfo {
  if (!buffer) {
    return { valid: false, error: 'Empty buffer provided' };
  }

  const ab = buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer;
  if (ab.byteLength < 44) {
    return { valid: false, error: `Buffer size (${ab.byteLength}) is smaller than 44-byte WAV header` };
  }

  const view = new DataView(ab);

  // Check RIFF
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') {
    return { valid: false, error: `Invalid RIFF magic bytes: expected 'RIFF', got '${riff}'` };
  }

  // Check WAVE
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') {
    return { valid: false, error: `Invalid WAVE magic bytes: expected 'WAVE', got '${wave}'` };
  }

  // Check fmt
  const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
  if (fmt !== 'fmt ') {
    return { valid: false, error: `Missing 'fmt ' chunk: got '${fmt}'` };
  }

  const audioFormat = view.getUint16(20, true);
  if (audioFormat !== 1) {
    return { valid: false, error: `Non-PCM audio format (${audioFormat})` };
  }

  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);

  // Check data
  const dataTag = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
  if (dataTag !== 'data') {
    return { valid: false, error: `Missing 'data' chunk: got '${dataTag}'` };
  }

  const dataByteLength = view.getUint32(40, true);

  if (44 + dataByteLength > ab.byteLength) {
    return {
      valid: false,
      error: `Declared data size (${dataByteLength}) exceeds buffer length (${ab.byteLength})`,
    };
  }

  return {
    valid: true,
    numChannels,
    sampleRate,
    bitsPerSample,
    dataByteLength,
    totalByteLength: ab.byteLength,
  };
}

export interface AudioPlaybackHandle {
  stop: () => void;
}

/**
 * Universal Audio Blob Player supporting HTML5 Audio and Web Audio contexts
 */
export async function playAudioBlob(
  blob: Blob,
  options: {
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<AudioPlaybackHandle> {
  const volume = Math.max(0, Math.min(1, options.volume ?? 1.0));

  // Node.js testing environment without real browser Audio
  if (typeof process !== 'undefined' && process.versions?.node && typeof window === 'undefined') {
    options.onStart?.();
    options.onEnd?.();
    return { stop: () => {} };
  }

  // 1. Try HTML5 Audio element first (preferred in browser/offscreen)
  if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined' && typeof URL !== 'undefined') {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = volume;

      let hasCleanedUp = false;
      const cleanup = (isExplicitStop: boolean = false) => {
        if (!hasCleanedUp) {
          hasCleanedUp = true;
          // Cancel pending callbacks immediately to prevent stale events from corrupting state
          audio.onplay = null;
          audio.onended = null;
          audio.onerror = null;
          try {
            audio.pause();
            audio.currentTime = 0;
            audio.src = '';
          } catch {}
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      };

      audio.onplay = () => {
        if (!hasCleanedUp) {
          options.onStart?.();
        }
      };

      audio.onended = () => {
        cleanup(false);
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        cleanup(false);
        options.onError?.(new Error('Audio element playback error'));
      };

      await audio.play();
      return { stop: () => cleanup(true) };
    } catch (audioErr) {
      console.debug('HTML5 Audio playback failed, falling back to Web Audio:', audioErr);
    }
  }

  // 2. Web Audio fallback
  if (typeof window !== 'undefined' || typeof (globalThis as any).AudioContext !== 'undefined') {
    try {
      const AudioContextClass = (globalThis as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gain = ctx.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(ctx.destination);

        let isStopped = false;
        const stop = (isExplicitStop: boolean = false) => {
          if (!isStopped) {
            isStopped = true;
            source.onended = null;
            try { source.stop(); } catch {}
            try { source.disconnect(); } catch {}
            try { gain.disconnect(); } catch {}
          }
        };

        source.onended = () => {
          stop(false);
          options.onEnd?.();
        };

        options.onStart?.();
        source.start(0);
        return { stop: () => stop(true) };
      }
    } catch (webAudioErr) {
      console.warn('Web Audio playback failed:', webAudioErr);
    }
  }

  // Node.js or environment without audio device
  options.onStart?.();
  options.onEnd?.();
  return { stop: () => {} };
}

