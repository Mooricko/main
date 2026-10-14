import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Crosshair,
  Volume2,
  VolumeX,
  Headphones,
  Flame,
  MoveHorizontal,
  AlignLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HighlightedWordParts, ReaderSettings, ReadingHeatmapData, WarmupStatus } from '../types';
import { THEME_CONFIGS, HIGHLIGHT_COLORS, FONT_CONFIGS } from '../utils/themeStyles';
import { calculateWordDelayMs } from '../utils/textParser';
import { analyzeWordSmartPace } from '../utils/smartPacing';
import { precalculateDriftOffsets } from '../utils/driftAnimation';
import { metronome } from '../utils/audioMetronome';
import { speechNarrator } from '../utils/speechNarration';
import { SpeedSliderToggle } from './SpeedSliderToggle';
import { RSVPWordDisplay } from './RSVPWordDisplay';
import { MetallicButton } from './MetallicButton';
import { ReadingHeatmapProgress } from './ReadingHeatmapProgress';
import { AutoPauseReason } from '../hooks/useSmartAutoPause';

import { ReaderDocumentHandle, DocumentStructure } from '../types';

interface RSVPReaderProps {
  words: HighlightedWordParts[];
  totalWords?: number;
  handle?: ReaderDocumentHandle | null;
  getWordsSlice?: (startIndex: number, count: number) => Promise<HighlightedWordParts[]>;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (updater: Partial<ReaderSettings>) => void;
  onRestart: () => void;
  isIdle?: boolean;
  heatmapData?: ReadingHeatmapData;
  onResetHeatmap?: () => void;
  onOpenStatsModal?: () => void;
  isAutoPaused?: boolean;
  autoPauseReason?: AutoPauseReason | null;
  onResume?: () => void;
  warmupStatus?: WarmupStatus;
  onWordStep?: () => void;
  onSkipWarmup?: () => void;
  onResetWarmup?: () => void;
  onSwitchToFlow?: () => void;
}

export const RSVPReader: React.FC<RSVPReaderProps> = ({
  words,
  totalWords: customTotalWords,
  handle: _handle,
  getWordsSlice,
  currentIndex,
  onIndexChange,
  isPlaying,
  onTogglePlay,
  settings,
  onUpdateSettings,
  onRestart,
  isIdle = false,
  heatmapData,
  onResetHeatmap,
  onOpenStatsModal,
  isAutoPaused = false,
  autoPauseReason = null,
  onResume,
  warmupStatus,
  onWordStep,
  onSkipWarmup,
  onResetWarmup,
  onSwitchToFlow,
}) => {
  const theme = THEME_CONFIGS[settings.theme];
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor];
  const font = FONT_CONFIGS[settings.fontFamily];

  const effectiveTotalWords = customTotalWords !== undefined ? customTotalWords : words.length;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasFinished, setHasFinished] = useState(false);
  const [docStructure, setDocStructure] = useState<DocumentStructure | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!_handle) {
      setDocStructure(null);
      return;
    }
    _handle
      .getStructure()
      .then((structure) => {
        if (!isCancelled && structure) {
          setDocStructure(structure);
        }
      })
      .catch((err) => {
        console.warn('[RSVPReader] Failed to load document structure:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, [_handle]);

  const isPlayingRef = useRef(isPlaying);
  const currentIndexRef = useRef(currentIndex);
  const settingsRef = useRef(settings);
  const wordsRef = useRef(words);
  const effectiveTotalWordsRef = useRef(effectiveTotalWords);
  const getWordsSliceRef = useRef(getWordsSlice);
  const onTogglePlayRef = useRef(onTogglePlay);
  const onIndexChangeRef = useRef(onIndexChange);
  const warmupStatusRef = useRef(warmupStatus);
  const onWordStepRef = useRef(onWordStep);

  // Keep refs updated for timer recursion without re-binding
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentIndexRef.current = currentIndex;
    settingsRef.current = settings;
    wordsRef.current = words;
    effectiveTotalWordsRef.current = effectiveTotalWords;
    getWordsSliceRef.current = getWordsSlice;
    onTogglePlayRef.current = onTogglePlay;
    onIndexChangeRef.current = onIndexChange;
    warmupStatusRef.current = warmupStatus;
    onWordStepRef.current = onWordStep;
  }, [isPlaying, currentIndex, settings, words, effectiveTotalWords, getWordsSlice, onTogglePlay, onIndexChange, warmupStatus, onWordStep]);

  // Main playback loop (Web Speech API Narration OR Visual RSVP Timer)
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      speechNarrator.stop();
      return;
    }

    // MODE A: Web Speech API Narration (Voice-Over in Sync)
    if (settings.speechNarration) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      speechNarrator.speakFromIndex({
        words: wordsRef.current,
        startIndex: currentIndexRef.current,
        totalWords: effectiveTotalWordsRef.current,
        getWordsSlice: getWordsSliceRef.current,
        settings: settingsRef.current,
        getCurrentWpm: () => {
          if (warmupStatusRef.current?.isWarmingUp) {
            return warmupStatusRef.current.currentWpm;
          }
          return settingsRef.current.wpm;
        },
        onWordSync: (syncedIdx) => {
          onWordStepRef.current?.();
          onIndexChangeRef.current(syncedIdx);
          if (settingsRef.current.metronomeSound) {
            const currentW = wordsRef.current.find(w => w.index === syncedIdx) || wordsRef.current[syncedIdx];
            metronome.playTick(settingsRef.current.metronomeVolume, currentW?.hasSentenceEnd);
          }
        },
        onFinished: () => {
          onTogglePlayRef.current();
          setHasFinished(true);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
          });
        },
        isPlayingCheck: () => isPlayingRef.current,
      });

      return () => {
        speechNarrator.stop();
      };
    }

    // MODE B: Standard Visual RSVP Timer
    const scheduleNextWord = () => {
      if (!isPlayingRef.current) return;

      const currIdx = currentIndexRef.current;
      const totalCount = effectiveTotalWordsRef.current;

      if (currIdx >= totalCount - 1) {
        // Reached the end of text!
        onTogglePlayRef.current();
        setHasFinished(true);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
        });
        return;
      }

      // Track word read in this session for Warm-up ramp
      onWordStepRef.current?.();

      // Always advance word-by-word so the vertical reel swipes to each word smoothly
      const nextIdx = Math.min(totalCount - 1, currIdx + 1);
      onIndexChangeRef.current(nextIdx);

      const allWords = wordsRef.current;
      const nextWord = allWords.find(w => w.index === nextIdx) || allWords[nextIdx];

      // Play subtle metronome tick if enabled
      if (settingsRef.current.metronomeSound && nextWord) {
        metronome.playTick(settingsRef.current.metronomeVolume, nextWord.hasSentenceEnd);
      }

      // Determine effective speed (warm-up speed or configured target)
      const currentEffectiveWpm = warmupStatusRef.current?.isWarmingUp
        ? warmupStatusRef.current.currentWpm
        : settingsRef.current.wpm;

      // Calculate duration for this word with Smart Pace and natural punctuation pauses
      let wordDelay = nextWord
        ? calculateWordDelayMs(
            nextWord,
            currentEffectiveWpm,
            settingsRef.current.smartPunctuationPause,
            settingsRef.current.smartPace
          )
        : (60 / currentEffectiveWpm) * 1000;
      if (wordDelay <= 0) {
        wordDelay = (60 / currentEffectiveWpm) * 1000;
      }

      timerRef.current = setTimeout(scheduleNextWord, wordDelay);
    };

    // Calculate initial delay for the first word
    const currentEffectiveWpm = warmupStatusRef.current?.isWarmingUp
      ? warmupStatusRef.current.currentWpm
      : settings.wpm;

    const currentWord = words.find(w => w.index === currentIndexRef.current) || words[currentIndexRef.current] || words[0];
    let initialDelay = currentWord
      ? calculateWordDelayMs(
          currentWord, 
          currentEffectiveWpm, 
          settings.smartPunctuationPause,
          settings.smartPace
        )
      : (60 / currentEffectiveWpm) * 1000;
    if (initialDelay <= 0) {
      initialDelay = (60 / currentEffectiveWpm) * 1000;
    }

    if (settings.metronomeSound && currentWord) {
      metronome.playTick(settings.metronomeVolume, currentWord.hasSentenceEnd);
    }

    timerRef.current = setTimeout(scheduleNextWord, initialDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      speechNarrator.stop();
    };
  }, [
    isPlaying, 
    settings.speechNarration, 
    settings.speechVoiceURI, 
    settings.farsiTtsEngine,
    settings.farsiTtsSpeed,
    settings.farsiTtsPitch,
    settings.speechPitch, 
    settings.speechVolume, 
    settings.speechRateMultiplier, 
    settings.wpm, 
    settings.smartPunctuationPause, 
    settings.smartPace,
    settings.warmupMode,
    settings.metronomeSound, 
    settings.metronomeVolume, 
    words.length > 0,
    effectiveTotalWords
  ]);

  // Handle manual jumps
  const handleJump = useCallback((offset: number) => {
    setHasFinished(false);
    const newIdx = Math.max(0, Math.min(effectiveTotalWords - 1, currentIndex + offset));
    onIndexChange(newIdx);

    if (settings.speechNarration && isPlaying) {
      speechNarrator.stop();
      speechNarrator.speakFromIndex({
        words: wordsRef.current,
        startIndex: newIdx,
        totalWords: effectiveTotalWordsRef.current,
        getWordsSlice: getWordsSliceRef.current,
        settings: settingsRef.current,
        getCurrentWpm: () => {
          if (warmupStatusRef.current?.isWarmingUp) {
            return warmupStatusRef.current.currentWpm;
          }
          return settingsRef.current.wpm;
        },
        onWordSync: (syncedIdx) => {
          onWordStepRef.current?.();
          onIndexChange(syncedIdx);
          if (settingsRef.current.metronomeSound) {
            const currentW = wordsRef.current.find(w => w.index === syncedIdx) || wordsRef.current[syncedIdx];
            metronome.playTick(settingsRef.current.metronomeVolume, currentW?.hasSentenceEnd);
          }
        },
        onFinished: () => {
          onTogglePlay();
          setHasFinished(true);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
          });
        },
        isPlayingCheck: () => isPlayingRef.current,
      });
    }
  }, [currentIndex, effectiveTotalWords, onIndexChange, settings.speechNarration, isPlaying, onTogglePlay]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setHasFinished(false);
    onIndexChange(val);

    if (settings.speechNarration && isPlaying) {
      speechNarrator.stop();
      speechNarrator.speakFromIndex({
        words: wordsRef.current,
        startIndex: val,
        totalWords: effectiveTotalWordsRef.current,
        getWordsSlice: getWordsSliceRef.current,
        settings: settingsRef.current,
        getCurrentWpm: () => {
          if (warmupStatusRef.current?.isWarmingUp) {
            return warmupStatusRef.current.currentWpm;
          }
          return settingsRef.current.wpm;
        },
        onWordSync: (syncedIdx) => {
          onWordStepRef.current?.();
          onIndexChange(syncedIdx);
          if (settingsRef.current.metronomeSound) {
            const currentW = wordsRef.current.find(w => w.index === syncedIdx) || wordsRef.current[syncedIdx];
            metronome.playTick(settingsRef.current.metronomeVolume, currentW?.hasSentenceEnd);
          }
        },
        onFinished: () => {
          onTogglePlay();
          setHasFinished(true);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7'],
          });
        },
        isPlayingCheck: () => isPlayingRef.current,
      });
    }
  };

  const currentWord = useMemo(() => {
    if (!words || words.length === 0) {
      return {
        original: '',
        prefixPunct: '',
        beforeHighlight: '',
        highlightedText: '',
        afterHighlight: '',
        suffixPunct: '',
        hasSentenceEnd: false,
        hasClausePause: false,
        hasParagraphBreak: false,
        index: currentIndex,
      };
    }
    const found = words.find((w) => w.index === currentIndex);
    if (found) return found;
    if (words[currentIndex] && (words[currentIndex].index === undefined || words[currentIndex].index === currentIndex)) {
      return words[currentIndex];
    }
    return words[0];
  }, [words, currentIndex]);

  const prevWord = useMemo(() => {
    if (currentIndex <= 0) return null;
    const found = words.find((w) => w.index === currentIndex - 1);
    if (found) return found;
    if (words[currentIndex - 1] && (words[currentIndex - 1].index === undefined || words[currentIndex - 1].index === currentIndex - 1)) {
      return words[currentIndex - 1];
    }
    return null;
  }, [words, currentIndex]);

  const nextWord = useMemo(() => {
    if (currentIndex >= effectiveTotalWords - 1) return null;
    const found = words.find((w) => w.index === currentIndex + 1);
    if (found) return found;
    if (words[currentIndex + 1] && (words[currentIndex + 1].index === undefined || words[currentIndex + 1].index === currentIndex + 1)) {
      return words[currentIndex + 1];
    }
    return null;
  }, [words, currentIndex, effectiveTotalWords]);

  const currentWordAnalysis = useMemo(() => {
    if (!settings.smartPace || !words[currentIndex]) return null;
    return analyzeWordSmartPace(words[currentIndex]);
  }, [settings.smartPace, words, currentIndex]);

  // Pre-calculated horizontal drift offsets to relieve fixed-point staring fatigue
  const driftOffsets = useMemo(() => {
    return precalculateDriftOffsets(words, settings.driftIntensity, settings.driftAnimation);
  }, [words, settings.driftIntensity, settings.driftAnimation]);

  const currentDriftOffset = useMemo(() => {
    if (!settings.driftAnimation) return 0;
    const localIdx = words.findIndex((w) => w.index === currentIndex);
    const targetIdx = localIdx !== -1 ? localIdx : currentIndex;
    return driftOffsets[targetIdx] ?? 0;
  }, [settings.driftAnimation, driftOffsets, words, currentIndex]);

  // Calculate progress & remaining time
  const progressPercent = effectiveTotalWords > 0 ? Math.round(((currentIndex + 1) / effectiveTotalWords) * 100) : 0;
  const wordsRemaining = Math.max(0, effectiveTotalWords - 1 - currentIndex);
  const secondsRemaining = Math.round((wordsRemaining / Math.max(1, settings.wpm)) * 60);
  const remainingMins = Math.floor(secondsRemaining / 60);
  const remainingSecs = secondsRemaining % 60;
  const formattedTimeRemaining = remainingMins > 0 ? `${remainingMins}m ${remainingSecs}s` : `${remainingSecs}s`;

  const isTextRtl = words.length > 0 && Boolean(words[0]?.isRtl || words.some((w) => w?.isRtl));

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-6 justify-between select-none min-h-0 overflow-hidden relative">
      {/* Top Status & Context Info */}
      <div 
        className={`flex items-center justify-between gap-3 text-xs transition-all duration-700 ease-out shrink-0 z-20 ${
          isIdle ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md border ${theme.borderClass} ${theme.cardBgClass} font-mono font-medium ${theme.textPrimary}`}>
            {currentIndex + 1} <span className={theme.textMuted}>/ {effectiveTotalWords}</span>
          </span>
          <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTimeRemaining} left</span>
          </span>
        </div>
      </div>

      {/* Right Edge Vertical Action Bar for RSVP Mode */}
      <aside 
        id="rsvp-right-edge-toolbar"
        aria-label="RSVP quick controls"
        className={`fixed right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 p-1.5 rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} backdrop-blur-md shadow-2xl transition-all duration-500 ease-out max-h-[calc(100vh-80px)] overflow-y-auto ${
          isIdle ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Words per Flash Selector (Vertical 1w / 3w / 5w) */}
        <div 
          id="rsvp-word-count-selector"
          className={`flex flex-col items-center rounded-xl border ${theme.borderClass} ${theme.cardBgClass} p-1 text-xs font-mono shadow-xs w-11 gap-0.5`}
          title="RSVP Words shown per flash: 1, 3, or 5 words"
        >
          {([1, 3, 5] as const).map((count) => {
            const isSelected = (settings.chunkSize || 1) === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => onUpdateSettings({ chunkSize: count })}
                title={`Show ${count} ${count === 1 ? 'word' : 'words'} per flash`}
                aria-label={`Show ${count} words per flash`}
                className={`w-full py-1 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : `${theme.textMuted} hover:${theme.textPrimary}`
                }`}
                style={isSelected ? { backgroundColor: highlight.hex } : undefined}
              >
                {count}w
              </button>
            );
          })}
        </div>

        {/* Word Size Controller (Vertical A+ / Size / A-) */}
        <div 
          id="rsvp-font-size-control-vertical"
          className={`flex flex-col items-center rounded-xl border ${theme.borderClass} ${theme.cardBgClass} p-1 text-xs font-mono shadow-xs w-11`}
          title={`RSVP word size: ${settings.fontSize}px`}
        >
          <button
            id="rsvp-font-increase-btn"
            type="button"
            onClick={() => onUpdateSettings({ fontSize: Math.min(100, settings.fontSize + 4) })}
            title="Increase word size (+)"
            aria-label="Increase word size (+)"
            className={`w-full py-1 rounded-lg font-bold text-xs flex items-center justify-center ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer`}
          >
            <span className="text-[11px] font-bold">A+</span>
          </button>
          <span className={`py-0.5 text-[10px] font-mono font-bold ${theme.textPrimary}`}>
            {settings.fontSize}
          </span>
          <button
            id="rsvp-font-decrease-btn"
            type="button"
            onClick={() => onUpdateSettings({ fontSize: Math.max(28, settings.fontSize - 4) })}
            title="Decrease word size (-)"
            aria-label="Decrease word size (-)"
            className={`w-full py-1 rounded-lg font-bold text-xs flex items-center justify-center ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer`}
          >
            <span className="text-[11px] font-bold">A-</span>
          </button>
        </div>

        {/* Smart Pace Quick Toggle (Vertical) */}
        <button
          id="toggle-smart-pace-btn"
          type="button"
          onClick={() => onUpdateSettings({ smartPace: !settings.smartPace })}
          title={
            settings.smartPace
              ? 'Smart Pace: ON (Dynamically adapts speed to word complexity & length)'
              : 'Smart Pace: OFF (Click to enable)'
          }
          aria-label="Toggle Smart Pace"
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-mono transition-all shadow-xs w-11 cursor-pointer ${
            settings.smartPace
              ? 'font-bold'
              : `${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted} opacity-75 hover:opacity-100`
          }`}
          style={
            settings.smartPace
              ? {
                  borderColor: `${highlight.hex}60`,
                  color: highlight.hex,
                  backgroundColor: `${highlight.hex}18`,
                }
              : undefined
          }
        >
          <Zap className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5">Pace</span>
        </button>

        {/* Drift Animation Quick Toggle (Vertical) */}
        <button
          id="toggle-drift-animation-btn"
          type="button"
          onClick={() => onUpdateSettings({ driftAnimation: !settings.driftAnimation })}
          title={
            settings.driftAnimation
              ? `Drift Animation: ON (${settings.driftIntensity || 'moderate'}, shifts active word periodically to eliminate fixed-point eye strain)`
              : 'Drift Animation: OFF (Click to enable anti-fatigue ocular drift)'
          }
          aria-label="Toggle Drift Animation"
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-mono transition-all shadow-xs w-11 cursor-pointer ${
            settings.driftAnimation
              ? 'font-bold'
              : `${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted} opacity-75 hover:opacity-100`
          }`}
          style={
            settings.driftAnimation
              ? {
                  borderColor: `${highlight.hex}60`,
                  color: highlight.hex,
                  backgroundColor: `${highlight.hex}18`,
                }
              : undefined
          }
        >
          <MoveHorizontal className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5">Drift</span>
        </button>

        {/* Fading Zoom Entrance Quick Toggle (Vertical) */}
        <button
          id="toggle-fading-zoom-btn"
          type="button"
          onClick={() => onUpdateSettings({ fadingZoomEntrance: settings.fadingZoomEntrance === false ? true : false })}
          title={
            settings.fadingZoomEntrance !== false
              ? 'Fading Zoom Entrance: ON (Subtly zooms new words in from optical depth to lock eyes in center)'
              : 'Fading Zoom Entrance: OFF (Click to enable subtle entrance zoom)'
          }
          aria-label="Toggle Fading Zoom Entrance"
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-mono transition-all shadow-xs w-11 cursor-pointer ${
            settings.fadingZoomEntrance !== false
              ? 'font-bold'
              : `${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted} opacity-75 hover:opacity-100`
          }`}
          style={
            settings.fadingZoomEntrance !== false
              ? {
                  borderColor: `${highlight.hex}60`,
                  color: highlight.hex,
                  backgroundColor: `${highlight.hex}18`,
                }
              : undefined
          }
        >
          <Crosshair className="w-4 h-4" />
          <span className="text-[8px] font-bold mt-0.5">Zoom</span>
        </button>

        {/* Speed / Warmup Badge (Vertical) */}
        {warmupStatus?.isWarmingUp ? (
          <div 
            className="w-11 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono flex flex-col items-center justify-center shadow-xs"
            title={`Warm-up Mode: Reading at ${warmupStatus.currentWpm} WPM, smoothly increasing to target ${settings.wpm} WPM (${warmupStatus.sessionWordsRead}/${warmupStatus.totalWarmupWords} words)`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold text-[10px] text-amber-300 leading-tight">{warmupStatus.currentWpm}</span>
            <span className="text-[8px] text-amber-400/80">WPM</span>
            {onSkipWarmup && (
              <button
                type="button"
                onClick={onSkipWarmup}
                className="text-[8px] underline text-amber-200 hover:text-white mt-0.5 cursor-pointer"
                title="Skip warm-up to reach target speed immediately"
              >
                Skip
              </button>
            )}
          </div>
        ) : (
          <div 
            className={`w-11 py-1.5 rounded-xl border ${theme.borderClass} ${theme.cardBgClass} text-xs font-mono font-semibold flex flex-col items-center justify-center shadow-xs`}
            title={`Current reading speed: ${settings.wpm} WPM`}
          >
            <span style={{ color: highlight.hex }} className="font-bold text-[11px] leading-tight">{settings.wpm}</span>
            <span className={`text-[8px] ${theme.textMuted}`}>WPM</span>
          </div>
        )}

        {/* Switch to Flow Mode Button (Vertical) */}
        {onSwitchToFlow && (
          <button
            id="rsvp-switch-to-flow-btn"
            type="button"
            onClick={onSwitchToFlow}
            title="Switch to Full Text Flow Mode"
            aria-label="Switch to Flow Mode"
            className={`flex flex-col items-center justify-center p-2 rounded-xl border ${theme.borderClass} ${theme.cardBgClass} ${theme.textPrimary} hover:${theme.accentSurface} transition-colors shadow-xs w-11 cursor-pointer`}
          >
            <AlignLeft className="w-4 h-4 text-red-500" />
            <span className="text-[8px] font-semibold mt-0.5">Flow</span>
          </button>
        )}
      </aside>

      {/* Main Center Reading Stage */}
      <div className="relative my-auto py-12 sm:py-20 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px]">
        {/* Subtle Background Glow Focus Halo */}
        <div 
          className="absolute inset-0 max-w-lg mx-auto rounded-full blur-3xl pointer-events-none opacity-10 transition-colors"
          style={{ backgroundColor: highlight.hex }}
        />

        {/* Reticle Guides (Top & Bottom Center Markers) */}
        {settings.showReticleGuides && (
          <div className="w-full max-w-xl flex flex-col items-center pointer-events-none mb-4">
            <div className="w-full flex items-center justify-between px-4">
              <div className={`h-[1px] flex-1 ${theme.borderClass} border-t`} />
              <div 
                className="flex flex-col items-center mx-4 transition-transform duration-700 ease-out will-change-transform"
                style={{
                  transform: currentDriftOffset !== 0 ? `translateX(${currentDriftOffset}px)` : undefined,
                }}
              >
                <div 
                  className="w-1 h-3.5 rounded-full"
                  style={{ backgroundColor: highlight.hex }}
                />
              </div>
              <div className={`h-[1px] flex-1 ${theme.borderClass} border-t`} />
            </div>
          </div>
        )}

        {/* The Word Container */}
        {hasFinished ? (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300 py-6">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${highlight.hex}20`, color: highlight.hex }}
            >
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold ${theme.textPrimary} mb-2`}>
              Reading Completed!
            </h2>
            <p className={`text-sm ${theme.textMuted} max-w-sm mb-6`}>
              You read <span className="font-semibold text-slate-200">{effectiveTotalWords} words</span> at{' '}
              <span className="font-semibold text-slate-200">{settings.wpm} WPM</span>.
            </p>
            <button
              id="restart-completed-btn"
              type="button"
              onClick={() => {
                setHasFinished(false);
                onRestart();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-transform active:scale-95 shadow-md"
              style={{ backgroundColor: highlight.hex }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Read Again</span>
            </button>
          </div>
        ) : (
          <div 
            className="relative w-full max-w-3xl flex flex-col items-center justify-center transition-transform duration-700 ease-out will-change-transform"
            style={{
              transform: currentDriftOffset !== 0 ? `translateX(${currentDriftOffset}px)` : undefined,
            }}
          >
            {/* Optional Contextual Words (Faded previous and next) */}
            {settings.showContextWords && (
              <div className="w-full flex items-center justify-between px-4 text-xs font-mono opacity-25 mb-3 select-none">
                <span className="truncate max-w-[120px] text-right">
                  {prevWord ? prevWord.original : ''}
                </span>
                <span className="truncate max-w-[120px] text-left">
                  {nextWord ? nextWord.original : ''}
                </span>
              </div>
            )}

            {/* RSVP Word Display Box */}
            <RSVPWordDisplay
              currentWord={currentWord}
              currentIndex={currentIndex}
              allWords={words}
              totalWords={effectiveTotalWords}
              isPlaying={isPlaying}
              settings={settings}
              theme={theme}
              highlight={highlight}
              font={font}
              onIndexChange={onIndexChange}
            />
          </div>
        )}

        {/* Reticle Guides (Bottom Center Marker) */}
        {settings.showReticleGuides && !hasFinished && (
          <div className="w-full max-w-xl flex flex-col items-center pointer-events-none mt-4">
            <div className="w-full flex items-center justify-between px-4">
              <div className={`h-[1px] flex-1 ${theme.borderClass} border-t`} />
              <div 
                className="flex flex-col items-center mx-4 transition-transform duration-700 ease-out will-change-transform"
                style={{
                  transform: currentDriftOffset !== 0 ? `translateX(${currentDriftOffset}px)` : undefined,
                }}
              >
                <div 
                  className="w-1 h-3.5 rounded-full"
                  style={{ backgroundColor: highlight.hex }}
                />
              </div>
              <div className={`h-[1px] flex-1 ${theme.borderClass} border-t`} />
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls & Timeline Bar */}
      <div 
        className={`w-full rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} p-4 sm:p-5 shadow-lg transition-all duration-700 ease-out shrink-0 z-20 ${
          isIdle ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Smart Auto-Pause Active Banner */}
        {isAutoPaused && !isPlaying && (
          <div
            id="smart-auto-pause-indicator"
            onClick={onResume || onTogglePlay}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onResume ? onResume() : onTogglePlay();
              }
            }}
            className="mb-3 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3 cursor-pointer transition-all animate-in fade-in duration-200"
            title="Click to resume reading"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-semibold shrink-0">Smart Auto-Paused</span>
              <span className="text-amber-400/50 hidden sm:inline">•</span>
              <span className="text-amber-200/80 truncate text-[11px] sm:text-xs">
                {autoPauseReason === 'mouse'
                  ? 'Cursor moved outside the reading window'
                  : 'Window lost focus (tab switch)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 font-medium text-[11px] sm:text-xs text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-lg hover:bg-amber-500/30 transition-colors">
              <span>Resume</span>
              <kbd className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono text-amber-100">Space</kbd>
            </div>
          </div>
        )}

        {/* Timeline Scrubber / Reading Complexity Heatmap */}
        <div className="mb-4">
          {settings.showHeatmapProgress !== false && heatmapData ? (
            <ReadingHeatmapProgress
              words={words}
              totalWords={effectiveTotalWords}
              currentIndex={currentIndex}
              onIndexChange={onIndexChange}
              heatmapData={heatmapData}
              theme={theme}
              highlightHex={highlight.hex}
              variant="inline"
              onResetHeatmap={onResetHeatmap}
              onOpenStatsModal={onOpenStatsModal}
            />
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-medium">
                <span className={theme.textMuted}>
                  Word {currentIndex + 1} of {effectiveTotalWords}
                </span>
                <span className={theme.textPrimary}>
                  {progressPercent}%
                </span>
              </div>

              <div className="relative flex items-center w-full">
                <input
                  id="reading-progress-slider"
                  type="range"
                  min="0"
                  max={Math.max(0, effectiveTotalWords - 1)}
                  value={currentIndex}
                  onChange={handleSeek}
                  aria-label="Reading progress"
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all"
                  style={{
                    background: `linear-gradient(to right, ${highlight.hex} 0%, ${highlight.hex} ${progressPercent}%, rgba(148, 163, 184, 0.2) ${progressPercent}%, rgba(148, 163, 184, 0.2) 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Restart & Step Rewind */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="rsvp-restart-btn"
              type="button"
              onClick={onRestart}
              title="Restart from beginning (R)"
              aria-label="Restart"
              className={`p-2.5 rounded-xl border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="rsvp-rewind-10-btn"
              type="button"
              onClick={() => handleJump(-10)}
              title="Back 10 words (Left Arrow)"
              aria-label="Back 10 words"
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${theme.borderClass} ${theme.textPrimary} hover:${theme.accentSurface} text-xs font-semibold transition-colors`}
            >
              <Rewind className="w-3.5 h-3.5" />
              <span>-10</span>
            </button>

            <button
              id="rsvp-prev-word-btn"
              type="button"
              onClick={() => handleJump(-1)}
              title="Previous Word"
              aria-label="Previous Word"
              className={`p-2.5 rounded-xl border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Master Play / Pause Button (Metallic Shader UI) */}
          <MetallicButton
            id="rsvp-play-pause-btn"
            viewMode="icon"
            isPlaying={isPlaying}
            onClick={() => {
              setHasFinished(false);
              onTogglePlay();
            }}
            sheenColor={highlight.hex}
            title={isPlaying ? 'Pause reading (Space)' : (currentIndex >= effectiveTotalWords - 1 ? 'Read Again (Space)' : 'Play reading (Space)')}
          />


          {/* Forward & Audio Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="rsvp-next-word-btn"
              type="button"
              onClick={() => handleJump(1)}
              title="Next Word (Right Arrow)"
              aria-label="Next Word"
              className={`p-2.5 rounded-xl border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="rsvp-forward-10-btn"
              type="button"
              onClick={() => handleJump(10)}
              title="Forward 10 words"
              aria-label="Forward 10 words"
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${theme.borderClass} ${theme.textPrimary} hover:${theme.accentSurface} text-xs font-semibold transition-colors`}
            >
              <span>+10</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>

            {/* Audio Metronome Toggle */}
            <button
              id="rsvp-metronome-toggle"
              type="button"
              onClick={() => onUpdateSettings({ metronomeSound: !settings.metronomeSound })}
              title={settings.metronomeSound ? 'Metronome sound enabled (Click to mute)' : 'Enable rhythmic focus metronome (S)'}
              aria-label="Toggle Metronome"
              className={`p-2.5 rounded-xl border transition-all ${
                settings.metronomeSound
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold shadow-xs'
                  : `${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
              }`}
            >
              {settings.metronomeSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Voice-Over Narration Toggle */}
            <button
              id="rsvp-voice-narration-toggle"
              type="button"
              onClick={() => onUpdateSettings({ speechNarration: !settings.speechNarration })}
              title={settings.speechNarration ? 'Voice-Over Narration is ON (Click to turn off)' : 'Enable Voice-Over Audio Narration (V)'}
              aria-label="Toggle Voice-Over Narration"
              className={`p-2.5 rounded-xl border transition-all ${
                settings.speechNarration
                  ? 'border-red-500 bg-red-500/15 text-red-400 font-bold shadow-xs ring-1 ring-red-500/30'
                  : `${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
              }`}
            >
              <Headphones className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Speed Slider Toggle (Merged Speed Controller matching reference design) */}
        <div className={`mt-3 pt-3 border-t ${theme.borderClass}`}>
          <SpeedSliderToggle
            wpm={settings.wpm}
            onWpmChange={(wpm) => onUpdateSettings({ wpm })}
            highlightHex={highlight.hex}
            theme={theme}
            warmupStatus={warmupStatus}
            onSkipWarmup={onSkipWarmup}
            isSmartPaceEnabled={settings.smartPace}
            smartPaceAnalysis={currentWordAnalysis}
            onToggleSmartPace={() => onUpdateSettings({ smartPace: !settings.smartPace })}
            isDriftEnabled={settings.driftAnimation}
            driftOffset={currentDriftOffset}
            onToggleDrift={() => onUpdateSettings({ driftAnimation: !settings.driftAnimation })}
          />
        </div>
      </div>
    </div>
  );
};
