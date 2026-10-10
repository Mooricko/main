/**
 * IndexedDB Model Store for Piper Farsi ONNX Models
 * 
 * Guarantees 100% offline persistence of neural TTS weights and configuration.
 * Once cached in IndexedDB, no external network calls are made.
 */

import { PiperCacheInfo, PiperErrorCategory } from './types';
import { validatePiperModelConfig, validatePiperModelBytes, PiperModelConfig } from './modelValidation';

const DB_NAME = 'AdhdReader_FarsiTTS_Models';
const DB_VERSION = 1;
const STORE_NAME = 'models';
export const DEFAULT_PIPER_MODEL_NAME = 'fa_IR-amir-medium';
export const PIPER_CACHE_VERSION = 'v2.1.0';

// Canonical HuggingFace repository for Piper Farsi Voice
const MODEL_BASE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/amir/medium';
const ONNX_FILENAME = 'fa_IR-amir-medium.onnx';
const JSON_FILENAME = 'fa_IR-amir-medium.onnx.json';

interface StoredModelRecord {
  id: string; // e.g. 'fa_IR-amir-medium'
  modelName: string;
  cacheVersion?: string;
  onnxBytes: ArrayBuffer;
  configJson: string;
  sizeBytes: number;
  timestamp: number;
}

class IndexedDbModelStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentProgress: number = 0;
  private currentStatus: 'not_cached' | 'downloading' | 'ready' | 'error' = 'not_cached';
  private errorMessage?: string;
  private errorCategory?: PiperErrorCategory;
  private listeners: Set<(info: PiperCacheInfo) => void> = new Set();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB for Piper models'));
      };
    });

    return this.dbPromise;
  }

  public subscribe(cb: (info: PiperCacheInfo) => void): () => void {
    this.listeners.add(cb);
    this.checkCache().then(cb).catch(() => {});
    return () => this.listeners.delete(cb);
  }

  private notify(info: PiperCacheInfo): void {
    this.listeners.forEach((cb) => cb(info));
  }

  /**
   * Check if the Piper model is cached locally in IndexedDB
   */
  public async checkCache(modelId: string = DEFAULT_PIPER_MODEL_NAME): Promise<PiperCacheInfo> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(modelId);

        req.onsuccess = () => {
          const record = req.result as StoredModelRecord | undefined;
          if (record && record.onnxBytes) {
            // Check cache version: if obsolete, invalidate and evict safely
            if (record.cacheVersion !== PIPER_CACHE_VERSION) {
              console.warn(
                `[IndexedDbModelStore] Evicting outdated Piper cache (version ${record.cacheVersion || 'v1'} vs expected ${PIPER_CACHE_VERSION})`
              );
              try { store.delete(modelId); } catch {}
              this.currentStatus = 'not_cached';
              const info: PiperCacheInfo = {
                status: 'not_cached',
                modelName: modelId,
                sizeBytes: 0,
                downloadProgress: 0,
                cacheVersion: PIPER_CACHE_VERSION,
                isOfflineReady: false,
              };
              this.notify(info);
              return resolve(info);
            }

            const bytesValidation = validatePiperModelBytes(record.onnxBytes);
            const configValidation = validatePiperModelConfig(record.configJson, modelId);

            if (bytesValidation.valid && configValidation.valid) {
              this.currentStatus = 'ready';
              this.errorMessage = undefined;
              this.errorCategory = undefined;
              const info: PiperCacheInfo = {
                status: 'ready',
                modelName: record.modelName || modelId,
                sizeBytes: record.sizeBytes || record.onnxBytes.byteLength,
                downloadProgress: 100,
                lastUpdated: record.timestamp,
                cacheVersion: PIPER_CACHE_VERSION,
                isOfflineReady: true,
              };
              this.notify(info);
              return resolve(info);
            } else {
              // Cache entry corrupt
              this.currentStatus = 'error';
              this.errorCategory = 'PARSE_FAILED';
              this.errorMessage = bytesValidation.error || configValidation.error || 'Corrupt model cache in IndexedDB';
              const info: PiperCacheInfo = {
                status: 'error',
                modelName: modelId,
                sizeBytes: 0,
                downloadProgress: 0,
                errorMessage: this.errorMessage,
                errorCategory: 'PARSE_FAILED',
                cacheVersion: PIPER_CACHE_VERSION,
                isOfflineReady: false,
              };
              this.notify(info);
              return resolve(info);
            }
          }

          this.currentStatus = this.currentStatus === 'downloading' ? 'downloading' : 'not_cached';
          const info: PiperCacheInfo = {
            status: this.currentStatus,
            modelName: modelId,
            sizeBytes: 0,
            downloadProgress: this.currentProgress,
            errorMessage: this.errorMessage,
            errorCategory: this.errorCategory,
            cacheVersion: PIPER_CACHE_VERSION,
            isOfflineReady: false,
          };
          this.notify(info);
          resolve(info);
        };

        req.onerror = () => {
          this.currentStatus = 'error';
          this.errorCategory = 'STORAGE_FAILED';
          this.errorMessage = 'Failed to read from IndexedDB';
          const info: PiperCacheInfo = {
            status: 'error',
            modelName: modelId,
            sizeBytes: 0,
            downloadProgress: 0,
            errorMessage: this.errorMessage,
            errorCategory: 'STORAGE_FAILED',
            cacheVersion: PIPER_CACHE_VERSION,
            isOfflineReady: false,
          };
          this.notify(info);
          resolve(info);
        };
      });
    } catch (e: any) {
      const info: PiperCacheInfo = {
        status: 'not_cached',
        modelName: modelId,
        sizeBytes: 0,
        downloadProgress: 0,
        errorMessage: e?.message,
        cacheVersion: PIPER_CACHE_VERSION,
        isOfflineReady: false,
      };
      this.notify(info);
      return info;
    }
  }

  /**
   * Retrieve cached ONNX model and config from IndexedDB.
   * Strictly validates that both ONNX model and JSON config exist and are valid.
   * Never silently substitutes {} on config error.
   */
  public async getModel(modelId: string = DEFAULT_PIPER_MODEL_NAME): Promise<{
    onnxBytes: ArrayBuffer;
    config: PiperModelConfig;
  } | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(modelId);

        req.onsuccess = () => {
          const record = req.result as StoredModelRecord | undefined;
          if (!record || !record.onnxBytes) {
            return resolve(null);
          }

          // Check cache version
          if (record.cacheVersion !== PIPER_CACHE_VERSION) {
            console.warn(`Piper cached model version mismatch (${record.cacheVersion} vs ${PIPER_CACHE_VERSION})`);
            return resolve(null);
          }

          // 1. Validate model weights
          const bytesValidation = validatePiperModelBytes(record.onnxBytes);
          if (!bytesValidation.valid) {
            console.error('Piper model bytes validation failed (parse failed):', bytesValidation.error);
            return resolve(null);
          }

          // 2. Validate configuration (Strict: no silent fallback to {})
          const configValidation = validatePiperModelConfig(record.configJson, modelId);
          if (!configValidation.valid || !configValidation.config) {
            console.error('Piper model config validation failed (parse failed):', configValidation.error);
            return resolve(null);
          }

          resolve({
            onnxBytes: record.onnxBytes,
            config: configValidation.config,
          });
        };

        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error reading Piper model from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Save model and config to IndexedDB after strict validation
   */
  public async saveModel(
    modelId: string,
    onnxBytes: ArrayBuffer,
    configJson: string
  ): Promise<boolean> {
    try {
      // 1. Validate model bytes
      const bytesValidation = validatePiperModelBytes(onnxBytes);
      if (!bytesValidation.valid) {
        throw new Error(`parse failed: ${bytesValidation.error}`);
      }

      // 2. Validate config
      const configValidation = validatePiperModelConfig(configJson, modelId);
      if (!configValidation.valid) {
        throw new Error(`parse failed: ${configValidation.error}`);
      }

      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: StoredModelRecord = {
          id: modelId,
          modelName: modelId,
          cacheVersion: PIPER_CACHE_VERSION,
          onnxBytes,
          configJson,
          sizeBytes: onnxBytes.byteLength,
          timestamp: Date.now(),
        };

        const req = store.put(record);
        req.onsuccess = () => {
          this.currentStatus = 'ready';
          this.currentProgress = 100;
          this.errorMessage = undefined;
          this.errorCategory = undefined;
          this.notify({
            status: 'ready',
            modelName: modelId,
            sizeBytes: onnxBytes.byteLength,
            downloadProgress: 100,
            cacheVersion: PIPER_CACHE_VERSION,
            isOfflineReady: true,
          });
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err: any) {
      console.error('Failed to save Piper model to IndexedDB:', err);
      return false;
    }
  }

  /**
   * Download model and persist in IndexedDB with real progress tracking.
   * Requires valid configuration and weights without silent fallbacks.
   */
  public async downloadAndCacheModel(
    onProgress?: (pct: number) => void
  ): Promise<boolean> {
    this.currentStatus = 'downloading';
    this.currentProgress = 5;
    this.errorMessage = undefined;

    this.notify({
      status: 'downloading',
      modelName: DEFAULT_PIPER_MODEL_NAME,
      sizeBytes: 0,
      downloadProgress: 5,
      isOfflineReady: false,
    });
    onProgress?.(5);

    try {
      // 1. Fetch Config JSON (local bundle first, then remote)
      let configJsonStr = '';
      try {
        const localConfigRes = await fetch(`/${JSON_FILENAME}`);
        if (localConfigRes.ok) {
          configJsonStr = await localConfigRes.text();
        }
      } catch {}

      if (!configJsonStr) {
        const configUrl = `${MODEL_BASE_URL}/${JSON_FILENAME}`;
        let configRes: Response;
        try {
          configRes = await fetch(configUrl);
        } catch (netErr: any) {
          const err: any = new Error(`download failed: network error fetching config from ${configUrl} (${netErr?.message})`);
          err.category = 'DOWNLOAD_FAILED';
          throw err;
        }
        if (!configRes.ok) {
          const err: any = new Error(`download failed: HTTP ${configRes.status} fetching config from ${configUrl}`);
          err.category = 'DOWNLOAD_FAILED';
          throw err;
        }
        configJsonStr = await configRes.text();
      }

      // Validate config immediately
      const configValidation = validatePiperModelConfig(configJsonStr, DEFAULT_PIPER_MODEL_NAME);
      if (!configValidation.valid) {
        const err: any = new Error(`parse failed: ${configValidation.error}`);
        err.category = 'PARSE_FAILED';
        throw err;
      }

      this.currentProgress = 15;
      onProgress?.(15);
      this.notify({
        status: 'downloading',
        modelName: DEFAULT_PIPER_MODEL_NAME,
        sizeBytes: 0,
        downloadProgress: 15,
        cacheVersion: PIPER_CACHE_VERSION,
        isOfflineReady: false,
      });

      // 2. Fetch ONNX Model weights with progress
      const modelUrl = `${MODEL_BASE_URL}/${ONNX_FILENAME}`;
      let modelRes: Response;
      try {
        modelRes = await fetch(modelUrl);
      } catch (netErr: any) {
        const err: any = new Error(`download failed: network error fetching weights from ${modelUrl} (${netErr?.message})`);
        err.category = 'DOWNLOAD_FAILED';
        throw err;
      }
      if (!modelRes.ok) {
        const err: any = new Error(`download failed: HTTP ${modelRes.status} fetching weights from ${modelUrl}`);
        err.category = 'DOWNLOAD_FAILED';
        throw err;
      }

      const contentLength = Number(modelRes.headers.get('content-length')) || 25 * 1024 * 1024;
      const reader = modelRes.body?.getReader();

      let onnxBytes: ArrayBuffer;
      if (!reader) {
        onnxBytes = await modelRes.arrayBuffer();
        this.currentProgress = 90;
        onProgress?.(90);
      } else {
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            const pct = Math.min(90, Math.floor(15 + (receivedBytes / contentLength) * 75));
            this.currentProgress = pct;
            onProgress?.(pct);
            this.notify({
              status: 'downloading',
              modelName: DEFAULT_PIPER_MODEL_NAME,
              sizeBytes: receivedBytes,
              downloadProgress: pct,
              cacheVersion: PIPER_CACHE_VERSION,
              isOfflineReady: false,
            });
          }
        }

        const merged = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        onnxBytes = merged.buffer;
      }

      // Validate weights before saving
      const bytesValidation = validatePiperModelBytes(onnxBytes);
      if (!bytesValidation.valid) {
        const err: any = new Error(`parse failed: ${bytesValidation.error}`);
        err.category = 'PARSE_FAILED';
        throw err;
      }

      // 3. Save to IndexedDB
      this.currentProgress = 95;
      onProgress?.(95);
      const saved = await this.saveModel(DEFAULT_PIPER_MODEL_NAME, onnxBytes, configJsonStr);
      if (!saved) {
        const err: any = new Error('storage failed: could not persist model and configuration in IndexedDB');
        err.category = 'STORAGE_FAILED';
        throw err;
      }

      this.currentStatus = 'ready';
      this.currentProgress = 100;
      this.errorMessage = undefined;
      this.errorCategory = undefined;
      onProgress?.(100);
      return true;
    } catch (err: any) {
      console.error('Piper model download error:', err);
      this.currentStatus = 'error';
      this.errorCategory = err?.category || (err?.message?.includes('download') ? 'DOWNLOAD_FAILED' : 'PARSE_FAILED');
      this.errorMessage = err?.message || 'Download failed';
      this.notify({
        status: 'error',
        modelName: DEFAULT_PIPER_MODEL_NAME,
        sizeBytes: 0,
        downloadProgress: 0,
        errorMessage: this.errorMessage,
        errorCategory: this.errorCategory,
        cacheVersion: PIPER_CACHE_VERSION,
        isOfflineReady: false,
      });
      return false;
    }
  }

  /**
   * Delete cached model from IndexedDB
   */
  public async clearCache(modelId: string = DEFAULT_PIPER_MODEL_NAME): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(modelId);
        req.onsuccess = () => {
          this.currentStatus = 'not_cached';
          this.currentProgress = 0;
          this.notify({
            status: 'not_cached',
            modelName: modelId,
            sizeBytes: 0,
            downloadProgress: 0,
            isOfflineReady: false,
          });
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not clear IndexedDB model cache:', err);
    }
  }
}

export const indexedDbModelStore = new IndexedDbModelStore();
