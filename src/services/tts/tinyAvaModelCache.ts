/**
 * Browser Cache API Model-Cache Helper for tiny-ava Offline Farsi TTS
 *
 * Uses `caches.open('tiny-ava-models-v1')` so both the web app and the Chrome
 * Extension Manifest V3 offscreen document can fetch, verify, and cache the
 * tiny-ava ONNX models and JSON metadata on first use with byte-level download
 * progress callbacks.
 *
 * Core Parisa bundle (default):
 * - g2p_encoder.onnx      (~3.5 MB)
 * - g2p_decoder.onnx      (~5.3 MB)
 * - tiny-ava-parisa.onnx  (~36.0 MB)
 * - tiny-ava-parisa.json  (~1.1 KB)
 *
 * Optional multi-voice / bilingual bundle (Parisa + Mana + Maya):
 * - tiny-ava-v2.onnx      (~36.0 MB)
 * - tiny-ava-v2.json      (~1.1 KB)
 * - lexicon_en.tsv        (~3.5 MB)
 */

export const TINY_AVA_CACHE_NAME = 'tiny-ava-models-v1';

export type TinyAvaAssetKind = 'onnx' | 'json' | 'tsv';

export interface TinyAvaModelAsset {
  /** Logical filename (e.g. 'tiny-ava-parisa.onnx') */
  name: string;
  /** Canonical remote URL on Hugging Face */
  url: string;
  /** Asset kind used for content-type & integrity validation */
  kind: TinyAvaAssetKind;
  /** Expected size in bytes (fallback if Content-Length header is omitted) */
  expectedBytes: number;
  /** Minimum valid byte length */
  minBytes: number;
}

export interface TinyAvaDownloadProgress {
  /** Current filename being processed */
  file: string;
  /** Canonical URL of current asset */
  url: string;
  /** Bytes downloaded so far for the current file */
  fileLoadedBytes: number;
  /** Total expected bytes for the current file */
  fileTotalBytes: number;
  /** Cumulative bytes loaded across all assets in the manifest */
  totalLoadedBytes: number;
  /** Total expected bytes across all assets in the manifest */
  totalExpectedBytes: number;
  /** Overall download percentage (0..100) */
  percent: number;
  /** True when the current asset was satisfied directly from Cache API */
  cached: boolean;
}

export interface TinyAvaCacheOptions {
  /** Include unified tiny-ava-v2 (Parisa/Mana/Maya) + English lexicon alongside core Parisa assets */
  includeMultiVoice?: boolean;
  /** Additional voice ONNX/JSON files to download & cache when enabled */
  extraAssets?: TinyAvaModelAsset[];
  /** Byte-level download progress callback */
  onProgress?: (progress: TinyAvaDownloadProgress) => void;
  /** Optional AbortSignal to cancel in-flight downloads */
  signal?: AbortSignal;
  /** Injectable CacheStorage for deterministic unit testing */
  cacheStorage?: CacheStorage;
  /** Injectable fetch implementation for deterministic unit testing */
  fetchImpl?: typeof fetch;
}

export const TINY_AVA_CORE_ASSETS: readonly TinyAvaModelAsset[] = [
  {
    name: 'g2p_encoder.onnx',
    url: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/g2p/g2p_encoder.onnx',
    kind: 'onnx',
    expectedBytes: 3_459_754,
    minBytes: 100_000,
  },
  {
    name: 'g2p_decoder.onnx',
    url: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/g2p/g2p_decoder.onnx',
    kind: 'onnx',
    expectedBytes: 5_305_604,
    minBytes: 100_000,
  },
  {
    name: 'tiny-ava-parisa.onnx',
    url: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-parisa.onnx',
    kind: 'onnx',
    expectedBytes: 36_034_045,
    minBytes: 100_000,
  },
  {
    name: 'tiny-ava-parisa.json',
    url: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-parisa.json',
    kind: 'json',
    expectedBytes: 1_146,
    minBytes: 100,
  },
] as const;

export const TINY_AVA_MULTIVOICE_ASSETS: readonly TinyAvaModelAsset[] = [
  {
    name: 'tiny-ava-v2.onnx',
    url: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-v2.onnx',
    kind: 'onnx',
    expectedBytes: 36_034_045,
    minBytes: 100_000,
  },
  {
    name: 'tiny-ava-v2.json',
    url: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-v2.json',
    kind: 'json',
    expectedBytes: 1_146,
    minBytes: 100,
  },
  {
    name: 'lexicon_en.tsv',
    url: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/lexicon_en.tsv',
    kind: 'tsv',
    expectedBytes: 3_454_357,
    minBytes: 10_000,
  },
] as const;

function resolveCacheStorage(override?: CacheStorage): CacheStorage {
  const storage = override ?? (typeof caches !== 'undefined' ? caches : undefined);
  if (!storage || typeof storage.open !== 'function') {
    throw new Error('Browser Cache API (caches) is unavailable in this environment');
  }
  return storage;
}

function getContentTypeForKind(kind: TinyAvaAssetKind): string {
  switch (kind) {
    case 'json':
      return 'application/json; charset=utf-8';
    case 'tsv':
      return 'text/tab-separated-values; charset=utf-8';
    case 'onnx':
    default:
      return 'application/octet-stream';
  }
}

function validateAssetBytes(asset: TinyAvaModelAsset, bytes: Uint8Array): void {
  if (bytes.byteLength < asset.minBytes) {
    throw new Error(
      `Invalid tiny-ava asset ${asset.name}: received ${bytes.byteLength} bytes (expected >= ${asset.minBytes})`
    );
  }
  if (asset.kind === 'json') {
    const text = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Invalid JSON metadata in ${asset.name}`);
    }
  }
}

/**
 * Returns the deduplicated list of tiny-ava model/metadata assets to cache.
 */
export function getTinyAvaAssetManifest(
  options: Pick<TinyAvaCacheOptions, 'includeMultiVoice' | 'extraAssets'> = {}
): TinyAvaModelAsset[] {
  const manifest: TinyAvaModelAsset[] = [...TINY_AVA_CORE_ASSETS];
  if (options.includeMultiVoice) {
    manifest.push(...TINY_AVA_MULTIVOICE_ASSETS);
  }
  if (options.extraAssets?.length) {
    manifest.push(...options.extraAssets);
  }

  const seen = new Set<string>();
  return manifest.filter((asset) => {
    if (seen.has(asset.url)) return false;
    seen.add(asset.url);
    return true;
  });
}

/**
 * Fetches a single tiny-ava asset from Cache API (`tiny-ava-models-v1`) or downloads
 * it over HTTPS with byte-level streaming progress callbacks and caches the Response.
 */
export async function fetchAndCacheTinyAvaAsset(
  asset: TinyAvaModelAsset,
  options: {
    cacheStorage?: CacheStorage;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    onChunk?: (loadedBytes: number, totalBytes: number, cached: boolean) => void;
  } = {}
): Promise<{ buffer: ArrayBuffer; cached: boolean; bytes: number }> {
  const storage = resolveCacheStorage(options.cacheStorage);
  const cache = await storage.open(TINY_AVA_CACHE_NAME);

  const cachedResponse = await cache.match(asset.url);
  if (cachedResponse && cachedResponse.ok) {
    const buffer = await cachedResponse.arrayBuffer();
    if (buffer.byteLength >= asset.minBytes) {
      options.onChunk?.(buffer.byteLength, buffer.byteLength, true);
      return { buffer, cached: true, bytes: buffer.byteLength };
    }
    // Evict corrupt/partial entry before re-downloading
    await cache.delete(asset.url);
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const response = await fetchFn(asset.url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Failed to download ${asset.name}: HTTP ${response.status} (${asset.url})`);
  }

  const headerLen = Number(response.headers.get('content-length')) || 0;
  const expectedTotal = headerLen > 0 ? headerLen : asset.expectedBytes;

  let merged: Uint8Array;
  const reader = response.body?.getReader();

  if (reader) {
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        chunks.push(value);
        loaded += value.byteLength;
        options.onChunk?.(loaded, Math.max(expectedTotal, loaded), false);
      }
    }

    merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    const ab = await response.arrayBuffer();
    merged = new Uint8Array(ab);
    options.onChunk?.(merged.byteLength, Math.max(expectedTotal, merged.byteLength), false);
  }

  validateAssetBytes(asset, merged);

  const cacheableResponse = new Response(merged.buffer.slice(0), {
    status: 200,
    headers: {
      'Content-Type': getContentTypeForKind(asset.kind),
      'Content-Length': String(merged.byteLength),
    },
  });
  await cache.put(asset.url, cacheableResponse);

  return {
    buffer: merged.buffer,
    cached: false,
    bytes: merged.byteLength,
  };
}

/**
 * Downloads and caches all requested tiny-ava model & JSON assets into
 * `caches.open('tiny-ava-models-v1')` with byte-level progress reporting.
 */
export async function ensureTinyAvaModelsCached(
  options: TinyAvaCacheOptions = {}
): Promise<Record<string, ArrayBuffer>> {
  const manifest = getTinyAvaAssetManifest(options);
  const fileExpected = new Map<string, number>(manifest.map((a) => [a.name, a.expectedBytes]));
  const fileLoaded = new Map<string, number>(manifest.map((a) => [a.name, 0]));
  const results: Record<string, ArrayBuffer> = {};

  const computeTotals = () => {
    let totalExpectedBytes = 0;
    let totalLoadedBytes = 0;
    for (const asset of manifest) {
      totalExpectedBytes += fileExpected.get(asset.name) ?? asset.expectedBytes;
      totalLoadedBytes += fileLoaded.get(asset.name) ?? 0;
    }
    const percent =
      totalExpectedBytes > 0
        ? Math.min(100, Math.round((totalLoadedBytes / totalExpectedBytes) * 100))
        : 100;
    return { totalExpectedBytes, totalLoadedBytes, percent };
  };

  for (const asset of manifest) {
    const { buffer, cached, bytes } = await fetchAndCacheTinyAvaAsset(asset, {
      cacheStorage: options.cacheStorage,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
      onChunk: (loadedBytes, totalBytes, isCached) => {
        fileLoaded.set(asset.name, loadedBytes);
        fileExpected.set(asset.name, Math.max(totalBytes, loadedBytes));
        const totals = computeTotals();
        options.onProgress?.({
          file: asset.name,
          url: asset.url,
          fileLoadedBytes: loadedBytes,
          fileTotalBytes: Math.max(totalBytes, loadedBytes),
          totalLoadedBytes: totals.totalLoadedBytes,
          totalExpectedBytes: totals.totalExpectedBytes,
          percent: totals.percent,
          cached: isCached,
        });
      },
    });

    fileLoaded.set(asset.name, bytes);
    fileExpected.set(asset.name, bytes);
    results[asset.name] = buffer;

    if (cached) {
      const totals = computeTotals();
      options.onProgress?.({
        file: asset.name,
        url: asset.url,
        fileLoadedBytes: bytes,
        fileTotalBytes: bytes,
        totalLoadedBytes: totals.totalLoadedBytes,
        totalExpectedBytes: totals.totalExpectedBytes,
        percent: totals.percent,
        cached: true,
      });
    }
  }

  return results;
}

/**
 * Looks up a cached tiny-ava asset by logical filename (e.g. 'tiny-ava-parisa.onnx')
 * or full URL inside `tiny-ava-models-v1`.
 */
export async function getCachedTinyAvaAsset(
  fileOrUrl: string,
  cacheStorage?: CacheStorage
): Promise<ArrayBuffer | null> {
  try {
    const storage = resolveCacheStorage(cacheStorage);
    const cache = await storage.open(TINY_AVA_CACHE_NAME);
    const known = [...TINY_AVA_CORE_ASSETS, ...TINY_AVA_MULTIVOICE_ASSETS].find(
      (a) => a.name === fileOrUrl || a.url === fileOrUrl
    );
    const targetUrl = known ? known.url : fileOrUrl;
    const match = await cache.match(targetUrl);
    if (!match || !match.ok) return null;
    return await match.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Returns true if every asset in the requested manifest is currently cached in `tiny-ava-models-v1`.
 */
export async function isTinyAvaCacheReady(
  options: Pick<TinyAvaCacheOptions, 'includeMultiVoice' | 'extraAssets' | 'cacheStorage'> = {}
): Promise<boolean> {
  try {
    const storage = resolveCacheStorage(options.cacheStorage);
    const cache = await storage.open(TINY_AVA_CACHE_NAME);
    const manifest = getTinyAvaAssetManifest(options);
    for (const asset of manifest) {
      const match = await cache.match(asset.url);
      if (!match || !match.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes the `tiny-ava-models-v1` Cache API store to reclaim storage.
 */
export async function clearTinyAvaModelCache(cacheStorage?: CacheStorage): Promise<boolean> {
  try {
    const storage = resolveCacheStorage(cacheStorage);
    return await storage.delete(TINY_AVA_CACHE_NAME);
  } catch {
    return false;
  }
}
