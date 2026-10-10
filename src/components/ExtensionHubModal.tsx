import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Puzzle, 
  Check, 
  Copy, 
  ExternalLink, 
  Zap, 
  FileCode, 
  Sparkles, 
  MousePointer, 
  Layers, 
  Command, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  Cpu,
  Play,
  Trash2,
  Activity,
  Volume2
} from 'lucide-react';
import { ReaderSettings } from '../types';
import { THEME_CONFIGS, HIGHLIGHT_COLORS } from '../utils/themeStyles';
import { downloadExtensionPackage } from '../utils/extensionPacker';
import { isChromeExtensionEnvironment, captureActiveTabText } from '../utils/extensionBridge';
import { farsiOfflineTts, SAMPLE_FARSI_TEXT } from '../services/tts/farsiOfflineTTS';
import { PiperCacheInfo, FarsiTtsEngineType } from '../services/tts/types';

const KEYBOARD_SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause reader (or resume after Smart Auto-Pause)' },
  { key: 'Ctrl/Cmd + O', desc: 'Open Sidebar: Text Input & Library Hub' },
  { key: 'Ctrl/Cmd + V', desc: 'Paste / Import clipboard text or URL' },
  { key: '← Left Arrow', desc: 'Rewind 10 words' },
  { key: '→ Right Arrow', desc: 'Jump forward 10 words' },
  { key: '↑ Up Arrow', desc: 'Increase reading speed (+25 WPM)' },
  { key: '↓ Down Arrow', desc: 'Decrease reading speed (-25 WPM)' },
  { key: '+ or =', desc: 'Increase font size (RSVP & Full Text Flow mode)' },
  { key: '-', desc: 'Decrease font size (RSVP & Full Text Flow mode)' },
  { key: 'R', desc: 'Restart reading from the beginning' },
  { key: 'F', desc: 'Toggle Fullscreen distraction-free mode' },
  { key: 'M', desc: 'Switch between RSVP and Full Text Flow mode' },
  { key: 'O', desc: 'Toggle Sidebar: Document Overview & Contents' },
  { key: 'T', desc: 'Open Focus Reading Timer' },
  { key: 'A', desc: 'Open Reading Statistics & Analytics (WPM over time)' },
  { key: 'D', desc: 'Toggle Dark / Light Theme mode' },
  { key: 'S', desc: 'Toggle Metronome focus sound' },
  { key: 'V', desc: 'Toggle Voice-Over Narration (Web Speech API)' },
  { key: 'Esc', desc: 'Close modals / Exit Fullscreen' },
];

interface ExtensionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCapturedText: (text: string, title?: string) => void;
  settings: ReaderSettings;
  initialTab?: 'shortcuts' | 'simulator' | 'install' | 'files' | 'farsiTts';
}

export const ExtensionHubModal: React.FC<ExtensionHubModalProps> = ({
  isOpen,
  onClose,
  onApplyCapturedText,
  settings,
  initialTab = 'shortcuts',
}) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'simulator' | 'install' | 'files' | 'farsiTts'>(initialTab);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<
    'manifest' | 'background' | 'offscreenHtml' | 'offscreenJs' | 'ttsBundle' | 'contentJs' | 'contentCss'
  >('contentJs');

  // Offline Farsi TTS Testing State
  const [activeEngine, setActiveEngine] = useState<FarsiTtsEngineType>('espeak');
  const [piperCache, setPiperCache] = useState<PiperCacheInfo>({
    status: 'not_cached',
    modelName: 'fa_IR-amir-medium',
    sizeBytes: 0,
    downloadProgress: 0,
    isOfflineReady: false
  });
  const [isFarsiTesting, setIsFarsiTesting] = useState(false);
  const [farsiFeedback, setFarsiFeedback] = useState<string | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);

  useEffect(() => {
    setActiveEngine(farsiOfflineTts.getActiveEngine());
    const unsub = farsiOfflineTts.subscribePiperCache((info) => {
      setPiperCache(info);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Simulator State
  const [simulatedSelection, setSimulatedSelection] = useState<string>('');
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);
  const [isCapturingActiveTab, setIsCapturingActiveTab] = useState(false);
  const simulatorContainerRef = useRef<HTMLDivElement>(null);

  const isExtensionEnv = isChromeExtensionEnvironment();
  const theme = THEME_CONFIGS[settings.theme];
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor];

  // Handle selection within simulator
  const handleSimulatorMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !simulatorContainerRef.current) {
      setBubblePosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setBubblePosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Check if selection is inside container
    const range = selection.getRangeAt(0);
    if (!simulatorContainerRef.current.contains(range.commonAncestorContainer)) {
      setBubblePosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = simulatorContainerRef.current.getBoundingClientRect();

    setSimulatedSelection(text);
    setBubblePosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 12,
      visible: true
    });
  };

  const handleTriggerSimulatedCapture = (textToRead?: string) => {
    const text = textToRead || simulatedSelection;
    if (!text) return;

    setCaptureFeedback('⚡ Captured highlighted text!');
    setTimeout(() => {
      onApplyCapturedText(text, 'Web Article Selection');
      onClose();
    }, 600);
  };

  const handleCaptureRealTab = async () => {
    setIsCapturingActiveTab(true);
    setCaptureFeedback(null);
    try {
      const result = await captureActiveTabText();
      if (result && result.text) {
        setCaptureFeedback('Captured from active tab!');
        setTimeout(() => {
          onApplyCapturedText(result.text, result.title || 'Captured Webpage');
          onClose();
        }, 500);
      } else {
        setCaptureFeedback('No text was selected on the active page.');
      }
    } catch {
      setCaptureFeedback('Unable to capture from tab.');
    } finally {
      setIsCapturingActiveTab(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionPackage();
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="extension-hub-modal"
        className={`w-full max-w-3xl h-[640px] max-h-[90vh] rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} shadow-2xl flex flex-col overflow-hidden animate-modal-slide-fade`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b ${theme.borderClass}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/25 shrink-0">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base sm:text-lg font-bold ${theme.textPrimary}`}>
                  Web Capture, Extension & Shortcuts
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Ready to Load
                </span>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Hands-free keyboard controls, web highlight capture & Chrome extension tools
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-extension-header-btn"
              type="button"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {downloadDone ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isDownloading ? 'Packaging...' : downloadDone ? 'Downloaded!' : 'Download .zip'}</span>
            </button>

            <button
              id="close-extension-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close extension modal"
              className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className={`flex items-center px-5 sm:px-6 pt-3 border-b ${theme.borderClass} gap-4 overflow-x-auto`}>
          <button
            id="tab-shortcuts-btn"
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'shortcuts'
                ? 'border-red-500 text-red-500'
                : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Keyboard Shortcuts</span>
          </button>

          <button
            id="tab-sim-btn"
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'simulator'
                ? 'border-red-500 text-red-500'
                : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <MousePointer className="w-4 h-4" />
            <span>Web Capture Simulator</span>
          </button>

          <button
            id="tab-guide-btn"
            type="button"
            onClick={() => setActiveTab('install')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'install'
                ? 'border-red-500 text-red-500'
                : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Installation Guide</span>
          </button>

          <button
            id="tab-code-btn"
            type="button"
            onClick={() => setActiveTab('files')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'files'
                ? 'border-red-500 text-red-500'
                : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Manifest & Scripts</span>
          </button>

          <button
            id="tab-farsi-tts-btn"
            type="button"
            onClick={() => setActiveTab('farsiTts')}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'farsiTts'
                ? 'border-red-500 text-red-500'
                : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <Cpu className="w-4 h-4 text-red-400" />
            <span>Dual-Engine Farsi TTS (Piper & eSpeak)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* TAB 0: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className={`p-3.5 rounded-xl border ${theme.borderClass} ${theme.accentSurface} flex items-start gap-3 text-xs`}>
                <Keyboard className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`font-semibold ${theme.textPrimary}`}>
                    Hands-free Reading Controls
                  </p>
                  <p className={theme.textMuted}>
                    Use these key bindings to navigate documents, adjust pacing, and switch modes without reaching for the mouse. Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-black/40 text-red-400 border-white/10 font-bold">?</kbd> at any time to open this menu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {KEYBOARD_SHORTCUTS.map((sc, i) => (
                  <div 
                    key={`sc-${sc.key}-${i}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${theme.borderClass} ${theme.inputBg}`}
                  >
                    <span className={`text-xs font-medium ${theme.textPrimary}`}>
                      {sc.desc}
                    </span>
                    <kbd 
                      className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border bg-black/30 text-red-400 border-white/10 shadow-xs shrink-0 ml-2"
                    >
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: CONTENT SCRIPT SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className={`p-3.5 rounded-xl border ${theme.borderClass} ${theme.accentSurface} flex items-start gap-3 text-xs`}>
                <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className={`font-semibold ${theme.textPrimary}`}>
                    Try highlighting text below with your mouse!
                  </p>
                  <p className={theme.textMuted}>
                    Notice how the content script attaches the floating <strong className="text-red-500">[ ⚡ Read in ADHD Reader ]</strong> bubble directly over your selection. Clicking it instantly transfers the text into RSVP word-by-word mode.
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold ${theme.textMuted}`}>Quick Try:</span>
                <button
                  id="sim-sample-1-btn"
                  type="button"
                  onClick={() => handleTriggerSimulatedCapture("Visual anchor fixation helps people with ADHD maintain unbroken reading flow by reducing involuntary regressions.")}
                  className={`text-xs px-2.5 py-1 rounded-lg border ${theme.borderClass} ${theme.textPrimary} hover:border-red-500/40 hover:bg-red-500/10 transition-colors`}
                >
                  Anchor Fixation Concept
                </button>
                <button
                  id="sim-sample-2-btn"
                  type="button"
                  onClick={() => handleTriggerSimulatedCapture("Rapid Serial Visual Presentation presents words sequentially at an Optimal Recognition Point, saving your eyes from saccadic fatigue.")}
                  className={`text-xs px-2.5 py-1 rounded-lg border ${theme.borderClass} ${theme.textPrimary} hover:border-red-500/40 hover:bg-red-500/10 transition-colors`}
                >
                  RSVP Ergonomics
                </button>
                {isExtensionEnv && (
                  <button
                    id="capture-live-tab-btn"
                    type="button"
                    onClick={handleCaptureRealTab}
                    disabled={isCapturingActiveTab}
                    className="text-xs px-3 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500 font-semibold hover:bg-red-500 hover:text-white transition-colors"
                  >
                    {isCapturingActiveTab ? 'Capturing...' : 'Capture Active Browser Tab'}
                  </button>
                )}
              </div>

              {/* Simulated Webpage Article Box */}
              <div className="relative">
                <div className={`p-2.5 rounded-t-xl border-t border-x ${theme.borderClass} bg-black/40 flex items-center justify-between text-[11px] ${theme.textMuted}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
                    <span className="ml-2 font-mono text-[10px] truncate max-w-xs">https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation</span>
                  </div>
                  <span className="font-semibold text-emerald-400">content.js active</span>
                </div>

                <div
                  ref={simulatorContainerRef}
                  onMouseUp={handleSimulatorMouseUp}
                  className={`p-5 rounded-b-xl border ${theme.borderClass} ${theme.inputBg} relative select-text leading-relaxed text-sm ${theme.textPrimary} font-sans min-h-[220px]`}
                >
                  <h4 className="text-base font-bold mb-2 text-red-500">
                    How RSVP & Middle-Letter Highlights Empower ADHD Reading
                  </h4>
                  <p className="mb-3 text-sm opacity-90">
                    Traditional reading requires constant eye movements called <em>saccades</em>, accompanied by brief pauses termed <em>fixations</em>. For neurodivergent readers, particularly individuals diagnosed with Attention-Deficit/Hyperactivity Disorder, these rapid micro-movements frequently cause involuntary regressions, losing track of lines, and attention drift.
                  </p>
                  <p className="text-sm opacity-90">
                    By combining <strong>Rapid Serial Visual Presentation (RSVP)</strong> with <strong>two middle-letter color contrast</strong>, the reader's visual cortex locks directly onto the word's Optimal Recognition Point (ORP). Your brain decodes lexical meaning up to 300% faster without mechanical eye strain.
                  </p>

                  {/* Simulated Floating Content Script Bubble */}
                  {bubblePosition.visible && (
                    <div
                      id="simulated-selection-bubble"
                      style={{
                        position: 'absolute',
                        left: `${bubblePosition.x}px`,
                        top: `${bubblePosition.y}px`,
                        transform: 'translate(-50%, -100%)',
                      }}
                      className="z-30 pointer-events-auto animate-in zoom-in-95 duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => handleTriggerSimulatedCapture()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-red-500 text-white text-xs font-bold shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        <span>Read in ADHD Reader</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status or Success Feedback */}
              {captureFeedback && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{captureFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INSTALLATION GUIDE */}
          {activeTab === 'install' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.accentSurface} space-y-2`}>
                <h4 className={`text-sm font-bold ${theme.textPrimary} flex items-center gap-2`}>
                  <Puzzle className="w-4 h-4 text-red-500" />
                  Install ADHD Reader in Google Chrome in 30 Seconds
                </h4>
                <p className={`text-xs ${theme.textMuted}`}>
                  Follow these standard developer steps to load the Manifest V3 extension:
                </p>
              </div>

              <div className="space-y-3">
                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-red-500 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Download and Extract
                  </div>
                  <p className={theme.textPrimary}>
                    Click the <strong>"Download .zip"</strong> button above to download <code className="px-1.5 py-0.5 rounded bg-black/30 font-mono text-xs">adhd-reader-chrome-extension-v3.zip</code>. Unzip the file on your computer.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-red-500 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">2</span>
                    Open Extensions in Chrome
                  </div>
                  <p className={theme.textPrimary}>
                    In Google Chrome or any Chromium browser (Brave, Edge), navigate to:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-red-400">
                      chrome://extensions
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('chrome://extensions', 'url')}
                      className={`p-1.5 rounded-lg border ${theme.borderClass} hover:${theme.accentSurface}`}
                      title="Copy URL"
                    >
                      {copiedCode === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-red-500 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">3</span>
                    Enable Developer Mode
                  </div>
                  <p className={theme.textPrimary}>
                    In the top-right corner of the Extensions page, toggle the <strong>Developer mode</strong> switch ON.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-red-500 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">4</span>
                    Load Unpacked Extension
                  </div>
                  <p className={theme.textPrimary}>
                    Click the <strong>Load unpacked</strong> button in the top-left corner, and select the extracted folder containing <code className="font-mono text-xs">manifest.json</code>.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-1.5`}>
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">5</span>
                    Start Highlighting & Reading
                  </div>
                  <p className={theme.textPrimary}>
                    Visit any website (news, Wikipedia, documentation, Substack). Highlight any text to see the floating <strong>⚡ Read in ADHD Reader</strong> button, or right-click to read!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANIFEST & SCRIPTS CODE VIEWER */}
          {activeTab === 'files' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('manifest')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'manifest'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    manifest.json (V3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('background')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'background'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    background.js (Router)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('offscreenHtml')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'offscreenHtml'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    offscreen.html
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('offscreenJs')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'offscreenJs'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    offscreen.js (Dispatcher)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('ttsBundle')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'ttsBundle'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    tts-engine.bundle.js (Unified)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('contentJs')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'contentJs'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    content.js
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFileType('contentCss')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedFileType === 'contentCss'
                        ? 'bg-red-500 text-white'
                        : `border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    content.css
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const code = getCodeSnippet(selectedFileType);
                    copyToClipboard(code, selectedFileType);
                  }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${theme.borderClass} ${theme.textPrimary} hover:${theme.accentSurface}`}
                >
                  {copiedCode === selectedFileType ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === selectedFileType ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[380px]">
                <pre>{getCodeSnippet(selectedFileType)}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: DUAL-ENGINE OFFLINE FARSI TTS PLAYGROUND */}
          {activeTab === 'farsiTts' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Architecture Pipeline Flow Diagram */}
              <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.accentSurface} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-red-500" />
                    <h3 className={`text-sm font-bold ${theme.textPrimary}`}>
                      معماری خط لوله سند برون‌صفحه (Manifest V3 Offscreen Audio Pipeline)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                    100% Offline No-CDN
                  </span>
                </div>

                <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                  سرویس‌ورکرهای بک‌گراند در Manifest V3 اجازه نگه داشتن نمونه‌های دائم <code>AudioContext</code> یا اجرای مستقیم WebAssembly سنگین را ندارند. بنابراین کل پردازش صوتی از طریق سند پنهان برون‌صفحه (<code>offscreen.html</code>) هدایت می‌شود:
                </p>

                {/* Visual Flow diagram */}
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
{`[ UI / Content Script ]
      │  (chrome.runtime.sendMessage: { action: "SPEAK", engine: "${activeEngine}", speed: ${ttsSpeed} })
      ▼
[ Background Service Worker (background.js) ]
      │  (اطمینان از وجود سند برون‌صفحه: chrome.offscreen.createDocument)
      ▼
[ Offscreen Document (offscreen.html + offscreen.js) ]
      ├─► موتور ۱: eSpeak NG WASM (سبک، رباتیک، بارگذاری آنی < 5MB)
      └─► موتور ۲: ONNX Runtime Web + Piper fa_IR (عصبی، طبیعی، کش IndexedDB)
      │
      ▼
[ Audio Player (HTML5 AudioContext / Audio Element در سند برون‌صفحه) ]`}
                </div>
              </div>

              {/* Interactive Engine Selection & Testing Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Engine 1: eSpeak NG */}
                <div 
                  onClick={() => {
                    setActiveEngine('espeak');
                    farsiOfflineTts.setEngine('espeak');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activeEngine === 'espeak'
                      ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      eSpeak NG (WASM)
                    </span>
                    {activeEngine === 'espeak' && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1 mb-3">
                    <li>• حجم سبک: کمتر از ۵ مگابایت</li>
                    <li>• بارگذاری بلادرنگ بدون نیاز به دانلود اولیه</li>
                    <li>• صدای شبیه‌سازی‌شده رباتیک آکوستیک</li>
                    <li>• مناسب سیستم‌های با پردازنده ضعیف</li>
                  </ul>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    وضعیت: آماده برای پخش آنی
                  </span>
                </div>

                {/* Engine 2: Piper Neural */}
                <div 
                  onClick={() => {
                    setActiveEngine('piper');
                    farsiOfflineTts.setEngine('piper');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    activeEngine === 'piper'
                      ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Piper Neural (ONNX Web)
                    </span>
                    {activeEngine === 'piper' && <CheckCircle2 className="w-4 h-4 text-red-500" />}
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1 mb-3">
                    <li>• کیفیت صدای عصبی و انسانی بالا (مدل fa_IR-amir)</li>
                    <li>• ذخیره ۱۰۰٪ آفلاین در IndexedDB مرورگر</li>
                    <li>• شتاب‌دهی WebAssembly SIMD / WebGPU</li>
                    <li>• فال‌بک خودکار به eSpeak در صورت عدم دانلود</li>
                  </ul>
                  <div className="flex items-center gap-2">
                    {piperCache.isOfflineReady ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        وضعیت: در حافظه ذخیره شد (آفلاین)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        وضعیت: نیاز به دانلود (~25MB)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Piper Cache Management & Testing Console */}
              <div className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200">
                      کنترل کش و دانلود مدل Piper Farsi
                    </div>
                    <div className="text-[11px] text-slate-400">
                      پس از یک‌بار دانلود، مدل بدون نیاز به اینترنت در حافظه مرورگر باقی می‌ماند.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!piperCache.isOfflineReady ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setFarsiFeedback('در حال دانلود مدل هوش مصنوعی Piper...');
                          const ok = await farsiOfflineTts.downloadPiperModel();
                          if (ok) {
                            setFarsiFeedback('✓ مدل با موفقیت دانلود و در IndexedDB ذخیره شد.');
                          } else {
                            setFarsiFeedback('⚠️ خطا در دانلود مدل. فال‌بک به eSpeak فعال است.');
                          }
                        }}
                        disabled={piperCache.status === 'downloading'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{piperCache.status === 'downloading' ? `دانلود (${piperCache.downloadProgress}%)` : 'دانلود مدل (~25MB)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          await farsiOfflineTts.clearPiperCache();
                          setFarsiFeedback('کش پاک شد.');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>پاک کردن کش مدل</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        setIsFarsiTesting(true);
                        try {
                          await farsiOfflineTts.preview(activeEngine, ttsSpeed, ttsPitch, 1.0, (reason) => {
                            setFarsiFeedback(reason);
                          });
                        } catch (err: any) {
                          setFarsiFeedback(err?.message || 'خطا در پخش');
                        } finally {
                          setTimeout(() => setIsFarsiTesting(false), 2800);
                        }
                      }}
                      disabled={isFarsiTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isFarsiTesting ? 'در حال گفتار...' : 'تست گفتار آفلاین (تست صدا)'}</span>
                    </button>
                  </div>
                </div>

                {farsiFeedback && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{farsiFeedback}</span>
                  </div>
                )}

                {/* Speed & Pitch Controls */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">سرعت گفتار (Speed)</span>
                      <span className="font-mono text-red-400 font-bold">{ttsSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.1"
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">زیروبمی صدا (Pitch)</span>
                      <span className="font-mono text-red-400 font-bold">{ttsPitch.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.1"
                      value={ttsPitch}
                      onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-red-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getCodeSnippet(type: 'manifest' | 'background' | 'offscreenHtml' | 'offscreenJs' | 'espeakJs' | 'piperJs' | 'ttsBundle' | 'contentJs' | 'contentCss'): string {
  switch (type) {
    case 'manifest':
      return `{
  "manifest_version": 3,
  "name": "ADHD Reader - RSVP & Focus Highlighter",
  "version": "1.0.0",
  "description": "Word-by-word RSVP focus reader highlighting middle letters in red. Offline Dual-Engine Farsi TTS (Piper ONNX & eSpeak WASM).",
  "permissions": [
    "tabs",
    "activeTab",
    "scripting",
    "contextMenus",
    "storage",
    "offscreen"
  ],
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "icons/*",
        "content.css",
        "offscreen.html",
        "offscreen.js",
        "ort.min.js",
        "ort-wasm-simd-threaded.wasm",
        "ort-wasm-simd-threaded.mjs",
        "tts-engine.bundle.js",
        "espeak-ng.wasm",
        "assets/*"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  "action": {
    "default_popup": "index.html",
    "default_title": "ADHD Reader",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ]
}`;
    case 'background':
      return `// background.js - Service Worker with Offscreen Document Lifecycle Router
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

async function hasOffscreenDocument() {
  if ('offscreen' in chrome && typeof chrome.offscreen?.hasDocument === 'function') {
    return await chrome.offscreen.hasDocument();
  }
  const matchedClients = await clients.matchAll();
  return matchedClients.some((c) => c.url.includes(OFFSCREEN_DOCUMENT_PATH));
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if ('offscreen' in chrome && typeof chrome.offscreen?.createDocument === 'function') {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Synthesize and play offline TTS audio for Farsi.'
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (['SPEAK', 'STOP', 'SET_ENGINE', 'GET_TTS_STATUS'].includes(message.action)) {
    (async () => {
      await ensureOffscreenDocument();
      chrome.runtime.sendMessage({ ...message, target: 'OFFSCREEN_TTS' }, (res) => {
        sendResponse(res || { success: true });
      });
    })();
    return true; // Keep channel open
  }
});`;
    case 'offscreenHtml':
      return `<!-- offscreen.html - Dedicated Audio Playback and WASM Sandbox -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ADHD Reader - Farsi Offline TTS Pipeline</title>
</head>
<body>
  <audio id="tts-audio-player"></audio>
  <script src="ort.min.js"></script>
  <script src="tts-engine.bundle.js"></script>
  <script src="offscreen.js"></script>
</body>
</html>`;
    case 'offscreenJs':
      return `// offscreen.js - Chrome Extension Audio Dispatcher & Playback Bridge
// Uses canonical TTS manager exported by tts-engine.bundle.js
const audioEl = document.getElementById('tts-audio-player');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'OFFSCREEN_TTS') return false;

  if (message.action === 'SPEAK') {
    const manager = window.farsiOfflineTts;
    manager.synthesize(message.text, {
      engine: message.engine,
      speed: message.speed,
      pitch: message.pitch,
      volume: message.volume,
      allowFallback: message.allowFallback ?? true
    })
    .then(async (res) => {
      if (res.success && res.wavBlob) {
        audioEl.src = URL.createObjectURL(res.wavBlob);
        await audioEl.play();
      }
      sendResponse({
        success: res.success,
        engineUsed: res.engineUsed,
        durationMs: res.durationMs,
        fallbackTriggered: res.fallbackTriggered,
        fallbackReason: res.fallbackReason
      });
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (message.action === 'STOP') {
    window.farsiOfflineTts?.stop();
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    sendResponse({ success: true });
  }
});`;
    case 'ttsBundle':
      return `// tts-engine.bundle.js - Unified Dual-Engine Offline Farsi TTS Architecture
// Compiled from src/services/tts/offscreenBridge.ts
//
// 1. Persian Normalization:
//    - Arabic -> Persian grapheme unification (ي/ى -> ی, ك -> ک)
//    - ZWNJ boundary preservation (\u200C for verbal prefixes & plural suffixes)
//    - Persian digits (۰-۹) and punctuation handling
//
// 2. Real eSpeak NG WASM (voice: "fa"):
//    - G2P: Converts text to authoritative IPA phonemes (salˈɑm dˈonjɑ)
//    - Synthesis: Direct 22,050Hz 16-bit mono PCM RIFF WAV audio generation
//
// 3. Piper Neural Engine (ONNX Runtime Web):
//    - Maps IPA phonemes to model token IDs via fa_IR-amir-medium.onnx.json
//    - Executes ONNX session (input, input_lengths, scales)
//    - Direct PCM WAV encoding via shared audioUtils.ts
//    - Honest reporting (engineUsed: 'piper')
//
// 4. Unified Manager (farsiOfflineTTS.ts):
//    - Orchestrates Piper with explicit manager-level fallback to real eSpeak NG
//
// Global APIs exposed in extension offscreen context:
window.farsiOfflineTts; // Canonical Manager
window.piperEngine;     // Piper Neural Engine
window.espeakEngine;    // Real eSpeak NG Engine`;
    case 'contentJs':
      return `// content.js - Injected selection reader script
(function () {
  document.addEventListener('mouseup', () => {
    const text = window.getSelection()?.toString().trim();
    if (text && text.length >= 2) {
      // Show floating quick-read bubble or Alt+R shortcut
    }
  });
})();`;
    case 'contentCss':
      return `/* content.css - Styling for floating reading trigger */
#adhd-reader-selection-bubble {
  position: absolute;
  z-index: 2147483647;
  transform: translateX(-50%);
  border-radius: 9999px;
}`;
  }
}
