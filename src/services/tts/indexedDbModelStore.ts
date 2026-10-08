/**
 * IndexedDB Model Store for Piper Farsi ONNX Models
 * 
 * Guarantees 100% offline persistence of neural TTS weights and configuration.
 * Once cached in IndexedDB, no external network calls are made.
 */

import { PiperCacheInfo } from './types';

const DB_NAME = 'AdhdReader_FarsiTTS_Models';
const DB_VERSION = 1;
const STORE_NAME = 'models';
export const DEFAULT_PIPER_MODEL_NAME = 'fa_IR-amir-medium';

// Canonical HuggingFace repository for Piper Farsi Voice
const MODEL_BASE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR/amir/medium';
const ONNX_FILENAME = 'fa_IR-amir-medium.onnx';
const JSON_FILENAME = 'fa_IR-amir-medium.onnx.json';

interface StoredModelRecord {
  id: string; // e.g. 'fa_IR-amir-medium'
  modelName: string;
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
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(modelId);

        req.onsuccess = () => {
          const record = req.result as StoredModelRecord | undefined;
          if (record && record.onnxBytes && record.onnxBytes.byteLength > 1000) {
            this.currentStatus = 'ready';
            const info: PiperCacheInfo = {
              status: 'ready',
              modelName: record.modelName || modelId,
              sizeBytes: record.sizeBytes || record.onnxBytes.byteLength,
              downloadProgress: 100,
              lastUpdated: record.timestamp,
              isOfflineReady: true,
            };
            this.notify(info);
            resolve(info);
          } else {
            this.currentStatus = this.currentStatus === 'downloading' ? 'downloading' : 'not_cached';
            const info: PiperCacheInfo = {
              status: this.currentStatus,
              modelName: modelId,
              sizeBytes: 0,
              downloadProgress: this.currentProgress,
              errorMessage: this.errorMessage,
              isOfflineReady: false,
            };
            this.notify(info);
            resolve(info);
          }
        };

        req.onerror = () => {
          const info: PiperCacheInfo = {
            status: 'error',
            modelName: modelId,
            sizeBytes: 0,
            downloadProgress: 0,
            errorMessage: 'Failed to read from IndexedDB',
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
        isOfflineReady: false,
      };
      this.notify(info);
      return info;
    }
  }

  /**
   * Retrieve cached ONNX model and config from IndexedDB
   */
  public async getModel(modelId: string = DEFAULT_PIPER_MODEL_NAME): Promise<{
    onnxBytes: ArrayBuffer;
    config: any;
  } | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(modelId);

        req.onsuccess = () => {
          const record = req.result as StoredModelRecord | undefined;
          if (record && record.onnxBytes) {
            let configObj = null;
            try {
              configObj = JSON.parse(record.configJson);
            } catch {
              configObj = {};
            }
            resolve({
              onnxBytes: record.onnxBytes,
              config: configObj,
            });
          } else {
            resolve(null);
          }
        };

        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error reading Piper model from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Save model to IndexedDB
   */
  public async saveModel(
    modelId: string,
    onnxBytes: ArrayBuffer,
    configJson: string
  ): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: StoredModelRecord = {
          id: modelId,
          modelName: modelId,
          onnxBytes,
          configJson,
          sizeBytes: onnxBytes.byteLength,
          timestamp: Date.now(),
        };

        const req = store.put(record);
        req.onsuccess = () => {
          this.currentStatus = 'ready';
          this.currentProgress = 100;
          this.notify({
            status: 'ready',
            modelName: modelId,
            sizeBytes: onnxBytes.byteLength,
            downloadProgress: 100,
            isOfflineReady: true,
          });
          resolve(true);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to save Piper model to IndexedDB:', err);
      return false;
    }
  }

  /**
   * Download model and persist in IndexedDB with real progress tracking
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
      // 1. Fetch Config JSON
      const configUrl = `${MODEL_BASE_URL}/${JSON_FILENAME}`;
      let configJsonStr = '{}';
      try {
        const configRes = await fetch(configUrl);
        if (configRes.ok) {
          configJsonStr = await configRes.text();
        }
      } catch (err) {
        console.warn('Could not fetch remote config, using default config fallback:', err);
      }

      this.currentProgress = 15;
      onProgress?.(15);
      this.notify({
        status: 'downloading',
        modelName: DEFAULT_PIPER_MODEL_NAME,
        sizeBytes: 0,
        downloadProgress: 15,
        isOfflineReady: false,
      });

      // 2. Fetch ONNX Model weights with progress
      const modelUrl = `${MODEL_BASE_URL}/${ONNX_FILENAME}`;
      const modelRes = await fetch(modelUrl);
      if (!modelRes.ok) {
        throw new Error(`Failed to fetch model weights: HTTP ${modelRes.status}`);
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

      // 3. Save to IndexedDB
      this.currentProgress = 95;
      onProgress?.(95);
      await this.saveModel(DEFAULT_PIPER_MODEL_NAME, onnxBytes, configJsonStr);

      this.currentStatus = 'ready';
      this.currentProgress = 100;
      onProgress?.(100);
      return true;
    } catch (err: any) {
      console.error('Piper model download error:', err);
      this.currentStatus = 'error';
      this.errorMessage = err?.message || 'Download failed';
      this.notify({
        status: 'error',
        modelName: DEFAULT_PIPER_MODEL_NAME,
        sizeBytes: 0,
        downloadProgress: 0,
        errorMessage: this.errorMessage,
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
