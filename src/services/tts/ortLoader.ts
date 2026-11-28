/**
 * Shared MV3-safe ONNX Runtime Web lazy loader.
 *
 * Reused by both Piper Neural and tiny-ava engines so WASM paths and thread limits
 * are configured once without duplicating runtime setup or violating Chrome Extension
 * Manifest V3 CSP (`script-src 'self' 'wasm-unsafe-eval'`).
 */

let cachedOrtModule: any = null;
let ortLoadPromise: Promise<any> | null = null;

function configureOrtWasm(ort: any): void {
  if (!ort?.env?.wasm) return;

  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    ort.env.wasm.wasmPaths = chrome.runtime.getURL('wasm/');
  } else {
    ort.env.wasm.wasmPaths = '/wasm/';
  }

  // Default to single-threaded WASM (numThreads = 1) unless both crossOriginIsolated
  // and SharedArrayBuffer are available, avoiding MV3 worker/COOP errors.
  const canUseThreads =
    typeof crossOriginIsolated !== 'undefined' &&
    Boolean(crossOriginIsolated) &&
    typeof SharedArrayBuffer !== 'undefined';
  if (canUseThreads) {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    ort.env.wasm.numThreads = Math.min(2, Math.max(1, cores - 1));
  } else {
    ort.env.wasm.numThreads = 1;
  }

  ort.env.wasm.simd = true;
}

export async function getOrt(): Promise<any> {
  // Check globalThis.ort first (e.g., Chrome Extension offscreen document preloaded ort.min.js)
  if (typeof (globalThis as any).ort !== 'undefined' && (globalThis as any).ort?.InferenceSession) {
    const globalOrt = (globalThis as any).ort;
    configureOrtWasm(globalOrt);
    cachedOrtModule = globalOrt;
    return cachedOrtModule;
  }

  if (cachedOrtModule) return cachedOrtModule;
  if (ortLoadPromise) return ortLoadPromise;

  ortLoadPromise = (async () => {
    try {
      let ort: any;
      try {
        ort = await import('onnxruntime-web/wasm');
      } catch {
        ort = await import('onnxruntime-web');
      }
      configureOrtWasm(ort);
      cachedOrtModule = ort;
      return ort;
    } catch (err) {
      console.warn('Could not dynamically load onnxruntime-web, fallback available:', err);
      return null;
    } finally {
      ortLoadPromise = null;
    }
  })();

  return ortLoadPromise;
}

export function resetOrtLoaderForTesting(): void {
  cachedOrtModule = null;
  ortLoadPromise = null;
}
