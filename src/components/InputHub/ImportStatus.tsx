import React from 'react';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Clipboard,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ImportState } from '../../types';
import {
  THIRD_PARTY_PROXIES,
  type ThirdPartyProxyId,
} from '../../services/import/extractUrl';

interface ImportStatusProps {
  state: ImportState;
  onRetry?: () => void;
  onApproveProxy?: (proxyId: ThirdPartyProxyId) => void;
  onPasteFallback?: () => void;
  onChooseAnotherFile?: () => void;
  onDismiss?: () => void;
}

function getSafeHttpHref(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const candidate = /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URL
  }
  return null;
}

export const ImportStatus: React.FC<ImportStatusProps> = ({
  state,
  onRetry,
  onApproveProxy,
  onPasteFallback,
  onChooseAnotherFile,
  onDismiss,
}) => {
  if (state.stage === 'idle') return null;

  const safeSourceUrl = getSafeHttpHref(state.sourceUrl);

  if (state.stage === 'error') {
    if (state.requiresProxyConsent && safeSourceUrl && onApproveProxy) {
      return (
        <div
          id="import-proxy-consent-banner"
          className="w-full p-4 rounded-2xl bg-amber-950/40 border border-amber-700/60 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-amber-200">
                Direct fetch couldn&apos;t load this page — send to a third-party proxy?
              </h4>
              <p className="text-xs text-amber-100/85 mt-1 leading-relaxed">
                {state.error ||
                  "Khoroos Reader's backend couldn't fetch this page directly."}
              </p>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                Choosing a service below sends this URL to that third party. Only allow this for public articles—never for private, unlisted, or logged-in links.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3 select-none">
                {THIRD_PARTY_PROXIES.map((proxy) => (
                  <button
                    key={proxy.id}
                    id={`import-approve-proxy-${proxy.id}`}
                    type="button"
                    onClick={() => onApproveProxy(proxy.id)}
                    title={proxy.description}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Send to {proxy.host}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2.5 border-t border-amber-800/40 select-none">
                <a
                  href={safeSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-800/60"
                  title="Open webpage in new tab to view and copy"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open page to copy</span>
                </a>

                {onPasteFallback && (
                  <button
                    type="button"
                    onClick={onPasteFallback}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Paste article text</span>
                  </button>
                )}

                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        id="import-error-banner"
        className="w-full p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-red-300">
              {state.error || "Couldn't finish preparing this document."}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {state.detectedType === 'url'
                ? 'The web page might be protected, behind a paywall, or blocking automated extraction.'
                : state.detectedType === 'pdf'
                ? 'This PDF might be an image scan without selectable text or password protected.'
                : 'Try copying the text directly or choosing another document.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3 select-none">
              {safeSourceUrl && (
                <a
                  href={safeSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-blue-800/60"
                  title="Open webpage in new tab to view and copy"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open page to copy</span>
                </a>
              )}

              {onPasteFallback && (
                <button
                  type="button"
                  onClick={onPasteFallback}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paste article text</span>
                </button>
              )}

              {onRetry && (
                <button
                  type="button"
                  id="import-retry-button"
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}

              {onChooseAnotherFile && (
                <button
                  type="button"
                  onClick={onChooseAnotherFile}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  <span>Try another file</span>
                </button>
              )}

              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading or Preparing states
  const isProcessing = ['detecting', 'reading', 'extracting', 'indexing', 'processing', 'preparing'].includes(state.stage);

  if (isProcessing) {
    return (
      <div 
        id="import-processing-banner"
        className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg text-slate-200 animate-in fade-in duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-red-400 shrink-0">
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-200">
                {state.message || 'Processing reading material...'}
              </span>
              {typeof state.progress === 'number' && (
                <span className="text-slate-400 font-mono">{state.progress}%</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-300 ease-out rounded-full"
                style={{
                  width: typeof state.progress === 'number' ? `${Math.max(10, state.progress)}%` : '60%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.stage === 'ready' && state.document) {
    return (
      <div 
        id="import-ready-banner"
        className="w-full p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 flex items-center justify-between animate-in fade-in duration-150"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="font-semibold text-xs sm:text-sm text-emerald-200">
              Ready — {state.document.metadata?.wordCount?.toLocaleString() || 'Multiple'} words
            </span>
            <span className="text-xs text-emerald-400/80 ml-2 truncate">
              {state.document.title}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
