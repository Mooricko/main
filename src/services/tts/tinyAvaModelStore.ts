/**
 * IndexedDB Model Store for tiny-ava v2 Bilingual Offline Farsi TTS
 *
 * Persists all 4 runtime artifacts + metadata JSON in IndexedDB so synthesis runs
 * 100% offline in both standard web pages and Chrome Extension MV3 offscreen documents:
 * - g2p_encoder.onnx (~3.5 MB, persian-g2p-tiny int8 ByT5 encoder)
 * - g2p_decoder.onnx (~5.3 MB, persian-g2p-tiny int8 ByT5 decoder)
 * - lexicon_en.tsv   (~3.5 MB, English IPA lexicon for bilingual spans)
 * - tiny-ava-v2.onnx (~36.0 MB, unified 4-voice Parisa / Mana / Maya model)
 * - tiny-ava-v2.json (~1.1 KB, bundled locally in public/tiny-ava-v2.json)
 */

import { TinyAvaCacheInfo, PiperErrorCategory } from './types';
import { TinyAvaModelMetadata, validateTinyAvaMetadata } from './tinyAvaFrontend';

const DB_NAME = 'AdhdReader_TinyAva_Models';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

export const TINY_AVA_MODEL_ID = 'tiny-ava-v2';
export const TINY_AVA_CACHE_VERSION = 'v2.0.0';

// Official Hugging Face asset URLs (mehdi-hf/tiny-ava + mehdi-hf/tiny-ava-demo)
export const TINY_AVA_ASSET_URLS = {
  metadata: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-v2.json',
  ttsModel: 'https://huggingface.co/mehdi-hf/tiny-ava/resolve/main/onnx/tiny-ava-v2.onnx',
  g2pEncoder: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/g2p/g2p_encoder.onnx',
  g2pDecoder: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/g2p/g2p_decoder.onnx',
  enLexicon: 'https://huggingface.co/spaces/mehdi-hf/tiny-ava-demo/resolve/main/assets/lexicon_en.tsv',
} as const;

const MIN_ONNX_BYTES = 100_000;
const MIN_LEXICON_BYTES = 10_000;

export interface StoredTinyAvaBundle {
  id: string;
  modelName: string;
  cacheVersion: string;
  g2pEncoderBytes: ArrayBuffer;
  g2pDecoderBytes: ArrayBuffer;
  ttsModelBytes: ArrayBuffer;
  enLexiconText: string;
  metadataJson: string;
  sizeBytes: number;
  timestamp: number;
}

export interface LoadedTinyAvaAssets {
  g2pEncoderBytes: ArrayBuffer;
  g2pDecoderBytes: ArrayBuffer;
  ttsModelBytes: ArrayBuffer;
  enLexiconText: string;
  metadata: TinyAvaModelMetadata;
}

function validateBundleIntegrity(record: StoredTinyAvaBundle | null | undefined): {
  valid: boolean;
  metadata?: TinyAvaModelMetadata;
  error?: string;
} {
  if (!record) return { valid: false, error: 'tiny-ava bundle not found in IndexedDB' };
  if (record.cacheVersion !== TINY_AVA_CACHE_VERSION) {
    return { valid: false, error: `tiny-ava cache version mismatch (${record.cacheVersion} vs ${TINY_AVA_CACHE_VERSION})` };
  }
  if (!record.g2pEncoderBytes || record.g2pEncoderBytes.byteLength < MIN_ONNX_BYTES) {
    return { valid: false, error: 'tiny-ava G2P encoder bytes missing or corrupt' };
  }
  if (!record.g2pDecoderBytes || record.g2pDecoderBytes.byteLength < MIN_ONNX_BYTES) {
    return { valid: false, error: 'tiny-ava G2P decoder bytes missing or corrupt' };
  }
  if (!record.ttsModelBytes || record.ttsModelBytes.byteLength < MIN_ONNX_BYTES) {
    return { valid: false, error: 'tiny-ava v2 ONNX model bytes missing or corrupt' };
  }
  if (typeof record.enLexiconText !== 'string' || record.enLexiconText.length < MIN_LEXICON_BYTES) {
    return { valid: false, error: 'tiny-ava English lexicon missing or corrupt' };
  }
  const metaCheck = validateTinyAvaMetadata(record.metadataJson);
  if (!metaCheck.valid || !metaCheck.metadata) {
    return { valid: false, error: metaCheck.error || 'Invalid tiny-ava metadata JSON' };
  }
  return { valid: true, metadata: metaCheck.metadata };
}

async function fetchBinaryWithProgress(
  url: string,
  expectedBytes: number,
  onFraction: (fraction: number, receivedBytes: number) => void
): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (netErr: any) {
    const err: any = new Error(`download failed: network error fetching ${url} (${netErr?.message})`);
    err.category = 'DOWNLOAD_FAILED';
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error(`download failed: HTTP ${res.status} fetching ${url}`);
    err.category = 'DOWNLOAD_FAILED';
    throw err;
  }

  const total = Number(res.headers.get('content-length')) || expectedBytes;
  const reader = res.body?.getReader();
  if (!reader) {
    const ab = await res.arrayBuffer();
    onFraction(1, ab.byteLength);
    return ab;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onFraction(Math.min(1, received / Math.max(1, total)), received);
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  onFraction(1, received);
  return merged.buffer;
}

class TinyAvaModelStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentProgress = 0;
  private currentStatus: 'not_cached' | 'downloading' | 'ready' | 'error' = 'not_cached';
  private statusDetail?: string;
  private errorMessage?: string;
  private errorCategory?: PiperErrorCategory;
  private listeners: Set<(info: TinyAvaCacheInfo) => void> = new Set();
  private inFlightDownload: Promise<boolean> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not supported in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open tiny-ava IndexedDB'));
    });

    return this.dbPromise;
  }

  public subscribe(cb: (info: TinyAvaCacheInfo) => void): () => void {
    this.listeners.add(cb);
    this.checkCache().then(cb).catch(() => {});
    return () => this.listeners.delete(cb);
  }

  private notify(info: TinyAvaCacheInfo): void {
    this.listeners.forEach((cb) => cb(info));
  }

  public async checkCache(): Promise<TinyAvaCacheInfo> {
    if (this.currentStatus === 'downloading') {
      return {
        status: 'downloading',
        modelName: TINY_AVA_MODEL_ID,
        sizeBytes: 0,
        downloadProgress: this.currentProgress,
        statusDetail: this.statusDetail,
        cacheVersion: TINY_AVA_CACHE_VERSION,
        isOfflineReady: false,
      };
    }

    try {
      const db = await this.getDB();
      return await new Promise<TinyAvaCacheInfo>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(TINY_AVA_MODEL_ID);

        req.onsuccess = () => {
          const record = req.result as StoredTinyAvaBundle | undefined;
          if (!record) {
            this.currentStatus = 'not_cached';
            const info: TinyAvaCacheInfo = {
              status: 'not_cached',
              modelName: TINY_AVA_MODEL_ID,
              sizeBytes: 0,
              downloadProgress: 0,
              errorMessage: this.errorMessage,
              errorCategory: this.errorCategory,
              cacheVersion: TINY_AVA_CACHE_VERSION,
              isOfflineReady: false,
            };
            this.notify(info);
            return resolve(info);
          }

          if (record.cacheVersion !== TINY_AVA_CACHE_VERSION) {
            try { store.delete(TINY_AVA_MODEL_ID); } catch {}
            this.currentStatus = 'not_cached';
            const info: TinyAvaCacheInfo = {
              status: 'not_cached',
              modelName: TINY_AVA_MODEL_ID,
              sizeBytes: 0,
              downloadProgress: 0,
              cacheVersion: TINY_AVA_CACHE_VERSION,
              isOfflineReady: false,
            };
            this.notify(info);
            return resolve(info);
          }

          const check = validateBundleIntegrity(record);
          if (check.valid) {
            this.currentStatus = 'ready';
            this.errorMessage = undefined;
            this.errorCategory = undefined;
            const info: TinyAvaCacheInfo = {
              status: 'ready',
              modelName: record.modelName || TINY_AVA_MODEL_ID,
              sizeBytes: record.sizeBytes,
              downloadProgress: 100,
              lastUpdated: record.timestamp,
              cacheVersion: TINY_AVA_CACHE_VERSION,
              isOfflineReady: true,
            };
            this.notify(info);
            return resolve(info);
          }

          this.currentStatus = 'error';
          this.errorCategory = 'PARSE_FAILED';
          this.errorMessage = check.error;
          const info: TinyAvaCacheInfo = {
            status: 'error',
            modelName: TINY_AVA_MODEL_ID,
            sizeBytes: 0,
            downloadProgress: 0,
            errorMessage: check.error,
            errorCategory: 'PARSE_FAILED',
            cacheVersion: TINY_AVA_CACHE_VERSION,
            isOfflineReady: false,
          };
          this.notify(info);
          resolve(info);
        };

        req.onerror = () => {
          this.currentStatus = 'error';
          this.errorCategory = 'STORAGE_FAILED';
          this.errorMessage = 'Failed to read tiny-ava cache from IndexedDB';
          const info: TinyAvaCacheInfo = {
            status: 'error',
            modelName: TINY_AVA_MODEL_ID,
            sizeBytes: 0,
            downloadProgress: 0,
            errorMessage: this.errorMessage,
            errorCategory: 'STORAGE_FAILED',
            cacheVersion: TINY_AVA_CACHE_VERSION,
            isOfflineReady: false,
          };
          this.notify(info);
          resolve(info);
        };
      });
    } catch (e: any) {
      const info: TinyAvaCacheInfo = {
        status: 'not_cached',
        modelName: TINY_AVA_MODEL_ID,
        sizeBytes: 0,
        downloadProgress: 0,
        errorMessage: e?.message,
        cacheVersion: TINY_AVA_CACHE_VERSION,
        isOfflineReady: false,
      };
      this.notify(info);
      return info;
    }
  }

  public async getAssets(): Promise<LoadedTinyAvaAssets | null> {
    try {
      const db = await this.getDB();
      return await new Promise<LoadedTinyAvaAssets | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(TINY_AVA_MODEL_ID);
        req.onsuccess = () => {
          const record = req.result as StoredTinyAvaBundle | undefined;
          const check = validateBundleIntegrity(record);
          if (!check.valid || !record || !check.metadata) {
            return resolve(null);
          }
          resolve({
            g2pEncoderBytes: record.g2pEncoderBytes,
            g2pDecoderBytes: record.g2pDecoderBytes,
            ttsModelBytes: record.ttsModelBytes,
            enLexiconText: record.enLexiconText,
            metadata: check.metadata,
          });
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error reading tiny-ava assets from IndexedDB:', err);
      return null;
    }
  }

  public async downloadAndCacheModel(onProgress?: (pct: number) => void): Promise<boolean> {
    if (this.inFlightDownload) return this.inFlightDownload;

    this.inFlightDownload = (async (): Promise<boolean> => {
      this.currentStatus = 'downloading';
      this.currentProgress = 2;
      this.errorMessage = undefined;
      this.errorCategory = undefined;

      const emit = (pct: number, detail: string, bytesSoFar = 0) => {
        const clamped = Math.max(0, Math.min(99, Math.floor(pct)));
        this.currentProgress = clamped;
        this.statusDetail = detail;
        onProgress?.(clamped);
        this.notify({
          status: 'downloading',
          modelName: TINY_AVA_MODEL_ID,
          sizeBytes: bytesSoFar,
          downloadProgress: clamped,
          statusDetail: detail,
          cacheVersion: TINY_AVA_CACHE_VERSION,
          isOfflineReady: false,
        });
      };

      try {
        emit(2, 'Loading tiny-ava metadata...');

        // 1. Metadata JSON (bundled local copy first, Hugging Face fallback)
        let metadataJson = '';
        try {
          const localUrl =
            typeof chrome !== 'undefined' && chrome.runtime?.getURL
              ? chrome.runtime.getURL('tiny-ava-v2.json')
              : '/tiny-ava-v2.json';
          const localRes = await fetch(localUrl);
          if (localRes.ok) {
            metadataJson = await localRes.text();
          }
        } catch {}

        if (!metadataJson) {
          const remoteRes = await fetch(TINY_AVA_ASSET_URLS.metadata);
          if (!remoteRes.ok) {
            const err: any = new Error(`download failed: HTTP ${remoteRes.status} fetching tiny-ava-v2.json`);
            err.category = 'DOWNLOAD_FAILED';
            throw err;
          }
          metadataJson = await remoteRes.text();
        }

        const metaCheck = validateTinyAvaMetadata(metadataJson);
        if (!metaCheck.valid) {
          const err: any = new Error(`parse failed: ${metaCheck.error}`);
          err.category = 'PARSE_FAILED';
          throw err;
        }

        // 2. Download G2P encoder (3.5 MB) -> 5%..15%
        emit(5, 'Downloading Persian G2P encoder (3.5 MB)...');
        const g2pEncoderBytes = await fetchBinaryWithProgress(
          TINY_AVA_ASSET_URLS.g2pEncoder,
          3_459_754,
          (f, rx) => emit(5 + f * 10, 'Downloading Persian G2P encoder (3.5 MB)...', rx)
        );

        // 3. Download G2P decoder (5.3 MB) -> 15%..28%
        emit(15, 'Downloading Persian G2P decoder (5.3 MB)...', g2pEncoderBytes.byteLength);
        const g2pDecoderBytes = await fetchBinaryWithProgress(
          TINY_AVA_ASSET_URLS.g2pDecoder,
          5_305_604,
          (f, rx) =>
            emit(
              15 + f * 13,
              'Downloading Persian G2P decoder (5.3 MB)...',
              g2pEncoderBytes.byteLength + rx
            )
        );

        // 4. Download English lexicon (3.5 MB) -> 28%..38%
        const baseAfterG2p = g2pEncoderBytes.byteLength + g2pDecoderBytes.byteLength;
        emit(28, 'Downloading English lexicon (3.5 MB)...', baseAfterG2p);
        const enLexiconBuf = await fetchBinaryWithProgress(
          TINY_AVA_ASSET_URLS.enLexicon,
          3_454_357,
          (f, rx) => emit(28 + f * 10, 'Downloading English lexicon (3.5 MB)...', baseAfterG2p + rx)
        );
        const enLexiconText = new TextDecoder('utf-8').decode(new Uint8Array(enLexiconBuf));

        // 5. Download unified tiny-ava v2 model (36.0 MB) -> 38%..94%
        const baseAfterLex = baseAfterG2p + enLexiconBuf.byteLength;
        emit(38, 'Downloading tiny-ava v2 voice model (34.4 MB)...', baseAfterLex);
        const ttsModelBytes = await fetchBinaryWithProgress(
          TINY_AVA_ASSET_URLS.ttsModel,
          36_034_045,
          (f, rx) =>
            emit(
              38 + f * 56,
              'Downloading tiny-ava v2 voice model (34.4 MB)...',
              baseAfterLex + rx
            )
        );

        const totalBytes = baseAfterLex + ttsModelBytes.byteLength + metadataJson.length;
        const record: StoredTinyAvaBundle = {
          id: TINY_AVA_MODEL_ID,
          modelName: TINY_AVA_MODEL_ID,
          cacheVersion: TINY_AVA_CACHE_VERSION,
          g2pEncoderBytes,
          g2pDecoderBytes,
          ttsModelBytes,
          enLexiconText,
          metadataJson,
          sizeBytes: totalBytes,
          timestamp: Date.now(),
        };

        const integrity = validateBundleIntegrity(record);
        if (!integrity.valid) {
          const err: any = new Error(`parse failed: ${integrity.error}`);
          err.category = 'PARSE_FAILED';
          throw err;
        }

        emit(96, 'Saving tiny-ava bundle to IndexedDB...', totalBytes);
        const db = await this.getDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error || new Error('Failed to store tiny-ava bundle'));
        });

        this.currentStatus = 'ready';
        this.currentProgress = 100;
        this.statusDetail = undefined;
        this.errorMessage = undefined;
        this.errorCategory = undefined;
        onProgress?.(100);
        this.notify({
          status: 'ready',
          modelName: TINY_AVA_MODEL_ID,
          sizeBytes: totalBytes,
          downloadProgress: 100,
          lastUpdated: record.timestamp,
          cacheVersion: TINY_AVA_CACHE_VERSION,
          isOfflineReady: true,
        });
        return true;
      } catch (err: any) {
        console.error('tiny-ava model download error:', err);
        this.currentStatus = 'error';
        this.currentProgress = 0;
        this.statusDetail = undefined;
        this.errorCategory =
          err?.category || (err?.message?.includes('download') ? 'DOWNLOAD_FAILED' : 'STORAGE_FAILED');
        this.errorMessage = err?.message || 'tiny-ava download failed';
        this.notify({
          status: 'error',
          modelName: TINY_AVA_MODEL_ID,
          sizeBytes: 0,
          downloadProgress: 0,
          errorMessage: this.errorMessage,
          errorCategory: this.errorCategory,
          cacheVersion: TINY_AVA_CACHE_VERSION,
          isOfflineReady: false,
        });
        return false;
      } finally {
        this.inFlightDownload = null;
      }
    })();

    return this.inFlightDownload;
  }

  public async clearCache(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(TINY_AVA_MODEL_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not clear tiny-ava IndexedDB cache:', err);
    } finally {
      this.currentStatus = 'not_cached';
      this.currentProgress = 0;
      this.statusDetail = undefined;
      this.errorMessage = undefined;
      this.errorCategory = undefined;
      this.notify({
        status: 'not_cached',
        modelName: TINY_AVA_MODEL_ID,
        sizeBytes: 0,
        downloadProgress: 0,
        cacheVersion: TINY_AVA_CACHE_VERSION,
        isOfflineReady: false,
      });
    }
  }
  /**
   * Updates cache UI subscribers when the web app or MV3 offscreen document
   * lazy-downloads tiny-ava model assets via Cache API (`tiny-ava-models-v1`).
   */
  public reportExternalDownloadProgress(progress: {
    file: string;
    totalLoadedBytes: number;
    totalExpectedBytes?: number;
    percent: number;
    cached?: boolean;
    cachedVoices?: ('parisa' | 'mana' | 'maya')[];
  }): void {
    const pct = Math.max(0, Math.min(100, Math.round(progress.percent)));
    const totalExpected = progress.totalExpectedBytes || progress.totalLoadedBytes;
    const loadedMb = (progress.totalLoadedBytes / (1024 * 1024)).toFixed(1);
    const totalMb = totalExpected > 0 ? (totalExpected / (1024 * 1024)).toFixed(1) : '29.0';

    if (pct >= 100) {
      this.currentStatus = 'ready';
      this.currentProgress = 100;
      this.statusDetail = undefined;
      this.errorMessage = undefined;
      this.errorCategory = undefined;
      this.notify({
        status: 'ready',
        modelName: TINY_AVA_MODEL_ID,
        sizeBytes: progress.totalLoadedBytes,
        loadedBytes: progress.totalLoadedBytes,
        totalBytes: totalExpected,
        cachedVoices: progress.cachedVoices,
        downloadProgress: 100,
        lastUpdated: Date.now(),
        cacheVersion: TINY_AVA_CACHE_VERSION,
        isOfflineReady: true,
      });
      return;
    }

    this.currentStatus = 'downloading';
    this.currentProgress = pct;
    this.statusDetail = `Downloading ${progress.file} (${loadedMb} / ${totalMb} MB · ${pct}%)`;
    this.notify({
      status: 'downloading',
      modelName: TINY_AVA_MODEL_ID,
      sizeBytes: progress.totalLoadedBytes,
      loadedBytes: progress.totalLoadedBytes,
      totalBytes: totalExpected,
      cachedVoices: progress.cachedVoices,
      downloadProgress: pct,
      statusDetail: this.statusDetail,
      cacheVersion: TINY_AVA_CACHE_VERSION,
      isOfflineReady: false,
    });
  }

  public reportExternalCacheState(info: Partial<TinyAvaCacheInfo> & { status: TinyAvaCacheInfo['status'] }): void {
    this.currentStatus = info.status;
    this.currentProgress = info.downloadProgress ?? (info.status === 'ready' ? 100 : 0);
    this.statusDetail = info.statusDetail;
    this.errorMessage = info.errorMessage;
    this.errorCategory = info.errorCategory;
    this.notify({
      status: info.status,
      modelName: info.modelName || TINY_AVA_MODEL_ID,
      sizeBytes: info.sizeBytes ?? 0,
      loadedBytes: info.loadedBytes,
      totalBytes: info.totalBytes,
      cachedVoices: info.cachedVoices,
      downloadProgress: this.currentProgress,
      statusDetail: this.statusDetail,
      lastUpdated: info.lastUpdated,
      errorMessage: this.errorMessage,
      errorCategory: this.errorCategory,
      cacheVersion: TINY_AVA_CACHE_VERSION,
      isOfflineReady: info.isOfflineReady ?? info.status === 'ready',
    });
  }
}

export const tinyAvaModelStore = new TinyAvaModelStore();
