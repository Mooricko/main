import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { 
  RotateCcw, 
  Eye, 
  Clock,
  Headphones,
  Volume2,
  VolumeX,
  Focus,
  Zap,
  Flame
} from 'lucide-react';
import { HighlightedWordParts, ReaderSettings, ReadingHeatmapData, WarmupStatus } from '../types';
import { THEME_CONFIGS, HIGHLIGHT_COLORS, FONT_CONFIGS, resolveLetterSpacingEm } from '../utils/themeStyles';
import { calculateWordDelayMs } from '../utils/textParser';
import { analyzeWordSmartPace } from '../utils/smartPacing';
import { metronome } from '../utils/audioMetronome';
import { speechNarrator } from '../utils/speechNarration';
import { SpeedSliderToggle } from './SpeedSliderToggle';
import { MetallicButton } from './MetallicButton';
import { MarkerHighlight } from './MarkerHighlight';
import { ReadingHeatmapProgress } from './ReadingHeatmapProgress';
import { LayoutGroup } from 'motion/react';
import { measureDevTiming } from '../utils/performanceDiagnostics';
import { ChapterScrubber, Chapter } from './ChapterScrubber';

import { ReaderDocumentHandle, ParagraphIndexEntry, DocumentStructure } from '../types';

interface FlowReaderProps {
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
  onSwitchToRsvp: () => void;
  isIdle?: boolean;
  heatmapData?: ReadingHeatmapData;
  onResetHeatmap?: () => void;
  onOpenStatsModal?: () => void;
  warmupStatus?: WarmupStatus;
  onWordStep?: () => void;
  onSkipWarmup?: () => void;
  onResetWarmup?: () => void;
}

interface ParagraphGroup {
  paragraphIndex: number;
  words: Array<{ word: HighlightedWordParts; globalIndex: number }>;
}

/**
 * Fast binary search to find the paragraphIndex for a global word index
 * using pre-processed structural paragraph index entries.
 */
function findParagraphIndexForWord(
  paragraphs: ParagraphIndexEntry[],
  wordIndex: number
): number {
  if (!paragraphs || paragraphs.length === 0) return 0;
  let low = 0;
  let high = paragraphs.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const p = paragraphs[mid];
    if (wordIndex >= p.startWordIndex && wordIndex <= p.endWordIndex) {
      return p.paragraphIndex;
    }
    if (wordIndex < p.startWordIndex) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  if (low >= paragraphs.length) return paragraphs[paragraphs.length - 1].paragraphIndex;
  return paragraphs[Math.max(0, high)].paragraphIndex;
}

export const FlowReader: React.FC<FlowReaderProps> = ({
  words,
  totalWords: customTotalWords,
  handle,
  getWordsSlice,
  currentIndex,
  onIndexChange,
  isPlaying,
  onTogglePlay,
  settings,
  onUpdateSettings,
  onRestart,
  onSwitchToRsvp,
  isIdle = false,
  heatmapData,
  onResetHeatmap,
  onOpenStatsModal,
  warmupStatus,
  onWordStep,
  onSkipWarmup,
  onResetWarmup,
}) => {
  const theme = THEME_CONFIGS[settings.theme];
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor];
  const font = FONT_CONFIGS[settings.fontFamily];
  
  const effectiveTotalWords = customTotalWords !== undefined ? customTotalWords : words.length;

  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paragraphRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hover tracking for floating highlighter pillow and paragraph focus
  // Retains the last hovered word/paragraph when the cursor leaves until it gets the cursor again or playback advances
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);
  const [hoveredParagraphIndex, setHoveredParagraphIndex] = useState<number | null>(null);

  const handleWordHover = useCallback((wordIdx: number, paragraphIdx?: number) => {
    setHoveredWordIndex((prev) => (prev === wordIdx ? prev : wordIdx));
    if (paragraphIdx !== undefined) {
      setHoveredParagraphIndex((prev) => (prev === paragraphIdx ? prev : paragraphIdx));
    }
  }, []);

  useEffect(() => {
    setHoveredWordIndex(null);
    setHoveredParagraphIndex(null);
  }, [currentIndex, isPlaying]);

  // Document-level natural paragraph structure loaded from handle (double newline pre-processing)
  const [docParagraphs, setDocParagraphs] = useState<ParagraphIndexEntry[] | null>(null);
  const [docStructure, setDocStructure] = useState<DocumentStructure | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!handle) {
      setDocParagraphs(null);
      setDocStructure(null);
      return;
    }

    // Pre-process document structure to detect natural double-newline breaks & outline chapters
    handle
      .getStructure()
      .then((structure) => {
        if (!isCancelled && structure) {
          setDocStructure(structure);
          if (structure?.paragraphs && structure.paragraphs.length > 0) {
            setDocParagraphs(structure.paragraphs);
          }
        }
      })
      .catch((err) => {
        console.warn('[FlowReader] Failed to load document structure:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [handle]);

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

  // Group words into paragraphs using robust natural break detection (double newlines)
  const paragraphGroups = useMemo<ParagraphGroup[]>(() => {
    if (!words || words.length === 0) return [];

    return measureDevTiming(
      'FlowReader natural paragraph grouping',
      () => {
        const groups: ParagraphGroup[] = [];

        // Strategy A: Pre-processed Document Structure with Natural Double-Newline Breaks
        if (docParagraphs && docParagraphs.length > 0) {
          let currentGroup: ParagraphGroup | null = null;

          for (let idx = 0; idx < words.length; idx++) {
            const w = words[idx];
            if (!w) continue;
            const globalIdx = w.index !== undefined ? w.index : idx;
            const pIdx = findParagraphIndexForWord(docParagraphs, globalIdx);

            if (!currentGroup || currentGroup.paragraphIndex !== pIdx) {
              if (currentGroup) {
                groups.push(currentGroup);
              }
              currentGroup = { paragraphIndex: pIdx, words: [] };
            }
            currentGroup.words.push({ word: w, globalIndex: globalIdx });
          }

          if (currentGroup) {
            groups.push(currentGroup);
          }

          return groups;
        }

        // Strategy B: Token-Level Natural Break Detection (Double Newline vs Sentence End)
        // Detect whether words contain explicit natural paragraph breaks (\n\n)
        const hasExplicitBreaks = words.some((w) => w?.hasParagraphBreak);

        if (hasExplicitBreaks) {
          let currentPIdx = words[0]?.paragraphIndex ?? 0;
          let currentGroup: ParagraphGroup = { paragraphIndex: currentPIdx, words: [] };

          for (let idx = 0; idx < words.length; idx++) {
            const w = words[idx];
            if (!w) continue;
            const globalIdx = w.index !== undefined ? w.index : idx;

            currentGroup.words.push({ word: w, globalIndex: globalIdx });

            // ONLY split on natural double newlines, NEVER solely on sentence-ending punctuation
            if (w.hasParagraphBreak && idx < words.length - 1) {
              groups.push(currentGroup);
              const nextWord = words[idx + 1];
              currentPIdx =
                nextWord?.paragraphIndex !== undefined && nextWord.paragraphIndex !== currentPIdx
                  ? nextWord.paragraphIndex
                  : currentPIdx + 1;
              currentGroup = { paragraphIndex: currentPIdx, words: [] };
            }
          }

          if (currentGroup.words.length > 0) {
            groups.push(currentGroup);
          }

          return groups;
        }

        // Strategy C: Fallback with Sentence-Punctuation Heuristic Guard
        // If neither docParagraphs nor explicit hasParagraphBreak flags exist:
        // Group by paragraphIndex, BUT verify that paragraphIndex changes are not just sentence ends!
        // If every sentence end has a distinct paragraphIndex (naive sentence-as-paragraph artifact),
        // coalesce them into natural multi-sentence paragraph blocks for clean reading flow.
        const distinctIndices = new Set(words.map((w) => w?.paragraphIndex ?? 0)).size;
        const sentenceEndCount = words.filter((w) => w?.hasSentenceEnd).length;
        const isSentenceFragmented =
          distinctIndices > 1 &&
          sentenceEndCount > 0 &&
          Math.abs(distinctIndices - sentenceEndCount) <= 2;

        if (isSentenceFragmented) {
          // Coalesce sentence-fragmented words into natural paragraphs (target ~60-90 words or 3-4 sentences)
          const TARGET_WORDS_PER_PARAGRAPH = 75;
          let currentGroup: ParagraphGroup = { paragraphIndex: 0, words: [] };
          let pCounter = 0;

          for (let idx = 0; idx < words.length; idx++) {
            const w = words[idx];
            if (!w) continue;
            const globalIdx = w.index !== undefined ? w.index : idx;
            currentGroup.words.push({ word: w, globalIndex: globalIdx });

            // Allow natural paragraph boundary after a sentence end when reaching target word threshold
            if (
              w.hasSentenceEnd &&
              currentGroup.words.length >= TARGET_WORDS_PER_PARAGRAPH &&
              idx < words.length - 1
            ) {
              groups.push(currentGroup);
              pCounter++;
              currentGroup = { paragraphIndex: pCounter, words: [] };
            }
          }

          if (currentGroup.words.length > 0) {
            groups.push(currentGroup);
          }

          return groups;
        }

        // Standard contiguous paragraphIndex grouping
        let currentGroup: ParagraphGroup | null = null;
        for (let idx = 0; idx < words.length; idx++) {
          const w = words[idx];
          if (!w) continue;
          const pIdx = w.paragraphIndex ?? 0;
          const globalIdx = w.index !== undefined ? w.index : idx;
          if (!currentGroup || currentGroup.paragraphIndex !== pIdx) {
            if (currentGroup) {
              groups.push(currentGroup);
            }
            currentGroup = { paragraphIndex: pIdx, words: [] };
          }
          currentGroup.words.push({ word: w, globalIndex: globalIdx });
        }

        if (currentGroup) {
          groups.push(currentGroup);
        }

        return groups;
      },
      (groups) => ({
        wordCount: words.length,
        paragraphCount: groups.length,
      })
    );
  }, [words, docParagraphs]);

  // Determine current active paragraph index from the group containing currentIndex
  const activeGroup = useMemo(() => {
    if (paragraphGroups.length === 0) return null;
    return (
      paragraphGroups.find((g) =>
        g.words.some((item) => item.globalIndex === currentIndex)
      ) || paragraphGroups[0]
    );
  }, [paragraphGroups, currentIndex]);

  const activeParagraphIndex = activeGroup?.paragraphIndex ?? 0;

  // Generate structured chapters/sections for the vertical ChapterScrubber
  const scrubberChapters = useMemo<Chapter[]>(() => {
    if (!words || words.length === 0) return [];

    // Strategy 1: Formal outline chapters (e.g. from PDF, EPUB, or Markdown)
    if (docStructure?.chapters && docStructure.chapters.length >= 2) {
      return docStructure.chapters.map((ch, idx) => {
        const startW = Math.max(0, Math.min(words.length - 1, ch.startWordIndex));
        const endW = Math.max(startW, Math.min(words.length - 1, ch.endWordIndex));
        const previewText = words
          .slice(startW, Math.min(startW + 24, words.length))
          .map((w) => w.original)
          .join(' ');

        return {
          id: ch.id || `chap-${idx}`,
          title: ch.title || `Chapter ${idx + 1}`,
          meta: ch.pageStart ? `Page ${ch.pageStart}` : `Chapter ${idx + 1} · ${endW - startW + 1} words`,
          description: previewText,
          startWordIndex: startW,
          endWordIndex: endW,
        };
      });
    }

    // Strategy 2: Natural paragraph blocks
    if (paragraphGroups && paragraphGroups.length >= 2) {
      return paragraphGroups.map((group) => {
        const startW = group.words[0]?.globalIndex ?? 0;
        const endW = group.words[group.words.length - 1]?.globalIndex ?? startW;
        const firstWords = group.words.slice(0, 6).map((w) => w.word.original).join(' ');
        const preview = group.words.slice(0, 24).map((w) => w.word.original).join(' ');

        return {
          id: `para-${group.paragraphIndex}`,
          title: firstWords ? `${firstWords}...` : `Paragraph ${group.paragraphIndex + 1}`,
          meta: `Paragraph ${group.paragraphIndex + 1} · ${group.words.length} words`,
          description: preview,
          startWordIndex: startW,
          endWordIndex: endW,
        };
      });
    }

    // Strategy 3: Paced reading milestones (every ~50-80 words)
    const count = Math.min(10, Math.max(3, Math.ceil(words.length / 50)));
    const step = Math.max(1, Math.floor(words.length / count));
    const items: Chapter[] = [];
    for (let i = 0; i < words.length; i += step) {
      const end = Math.min(words.length - 1, i + step - 1);
      const preview = words.slice(i, Math.min(i + 20, words.length)).map((w) => w.original).join(' ');
      const pct = Math.round((i / words.length) * 100);
      items.push({
        id: `section-${i}`,
        title: `Section ${items.length + 1} (${pct}%)`,
        meta: `Word ${i + 1} - ${end + 1}`,
        description: preview,
        startWordIndex: i,
        endWordIndex: end,
      });
    }
    return items;
  }, [words, docStructure, paragraphGroups]);

  // Current active chapter index in the scrubber
  const currentScrubberIndex = useMemo(() => {
    if (!scrubberChapters || scrubberChapters.length === 0) return 0;
    const foundIdx = scrubberChapters.findIndex(
      (c) => currentIndex >= (c.startWordIndex ?? 0) && currentIndex <= (c.endWordIndex ?? Infinity)
    );
    return foundIdx >= 0 ? foundIdx : 0;
  }, [scrubberChapters, currentIndex]);

  // Handle selecting a chapter from the scrubber
  const handleScrubberSelect = useCallback(
    (chapter: Chapter) => {
      if (chapter.startWordIndex !== undefined) {
        onIndexChange(chapter.startWordIndex);
        const targetWord = chapter.startWordIndex;
        const targetGroup = paragraphGroups.find((g) =>
          g.words.some((w) => w.globalIndex === targetWord)
        );
        if (targetGroup && paragraphRefs.current[targetGroup.paragraphIndex]) {
          paragraphRefs.current[targetGroup.paragraphIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    },
    [onIndexChange, paragraphGroups]
  );
  const activeWord =
    words.find((w) => w && w.index === currentIndex) ||
    (words[currentIndex] &&
    (words[currentIndex].index === undefined || words[currentIndex].index === currentIndex)
      ? words[currentIndex]
      : words[0]);

  // PART I: Paragraph-level virtualization with modest overscan region
  const OVERSCAN_PARAGRAPHS = 6;
  const activeGroupIdx = useMemo(() => {
    if (paragraphGroups.length === 0) return 0;
    const idx = paragraphGroups.findIndex((g) => g.paragraphIndex === activeParagraphIndex);
    return idx >= 0 ? idx : 0;
  }, [paragraphGroups, activeParagraphIndex]);

  const { visibleGroups, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    if (paragraphGroups.length <= 14) {
      return {
        visibleGroups: paragraphGroups,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }
    const startIdx = Math.max(0, activeGroupIdx - OVERSCAN_PARAGRAPHS);
    const endIdx = Math.min(paragraphGroups.length, activeGroupIdx + OVERSCAN_PARAGRAPHS + 1);
    const estimatedParaHeight = 75;
    return {
      visibleGroups: paragraphGroups.slice(startIdx, endIdx),
      topSpacerHeight: startIdx * estimatedParaHeight,
      bottomSpacerHeight: (paragraphGroups.length - endIdx) * estimatedParaHeight,
    };
  }, [paragraphGroups, activeGroupIdx]);

  const currentWordAnalysis = useMemo(() => {
    if (!settings.smartPace || !activeWord) return null;
    return analyzeWordSmartPace(activeWord);
  }, [settings.smartPace, activeWord]);

  // Auto-scroll unblurred active paragraph to center of viewport
  const scrollToActiveParagraph = useCallback((smooth = true) => {
    const pEl = paragraphRefs.current[activeParagraphIndex];
    if (pEl && containerRef.current) {
      pEl.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
      });
    }
  }, [activeParagraphIndex]);

  const lastCenteredParagraphRef = useRef<number>(-1);

  // Center active paragraph on paragraph change or while playing
  useEffect(() => {
    if (lastCenteredParagraphRef.current !== activeParagraphIndex || isPlaying || settings.focusParagraphBlur) {
      lastCenteredParagraphRef.current = activeParagraphIndex;
      scrollToActiveParagraph(true);
    }
  }, [activeParagraphIndex, isPlaying, settings.focusParagraphBlur, scrollToActiveParagraph]);

  // Playback timer & Speech Narration loop in Flow Mode
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      speechNarrator.stop();
      return;
    }

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
        },
        onFinished: () => {
          onTogglePlayRef.current();
        },
        isPlayingCheck: () => isPlayingRef.current,
      });

      return () => {
        speechNarrator.stop();
      };
    }

    // Standard auto-tracking timer loop
    const scheduleNextWord = () => {
      if (!isPlayingRef.current) return;

      const currIdx = currentIndexRef.current;
      const totalCount = effectiveTotalWordsRef.current;

      if (currIdx >= totalCount - 1) {
        onTogglePlayRef.current();
        return;
      }

      onWordStepRef.current?.();
      const nextIdx = Math.min(totalCount - 1, currIdx + 1);
      onIndexChangeRef.current(nextIdx);

      const allWords = wordsRef.current;
      const currentWordObj = allWords.find(w => w.index === nextIdx) || (allWords[nextIdx] && (allWords[nextIdx].index === undefined || allWords[nextIdx].index === nextIdx) ? allWords[nextIdx] : undefined);
      
      // Audio metronome tick synchronization
      if (settingsRef.current.metronomeSound && currentWordObj) {
        metronome.playTick(settingsRef.current.metronomeVolume, currentWordObj?.hasSentenceEnd);
      }

      const effectiveWpm = warmupStatusRef.current?.isWarmingUp
        ? warmupStatusRef.current.currentWpm
        : settingsRef.current.wpm;

      const delay = currentWordObj
        ? calculateWordDelayMs(
            currentWordObj,
            effectiveWpm,
            settingsRef.current.smartPunctuationPause,
            settingsRef.current.smartPace
          )
        : (60 / effectiveWpm) * 1000;

      timerRef.current = setTimeout(scheduleNextWord, delay);
    };

    const effectiveWpm = warmupStatusRef.current?.isWarmingUp
      ? warmupStatusRef.current.currentWpm
      : settings.wpm;

    const currentWordObj = words.find(w => w.index === currentIndexRef.current) || (words[currentIndexRef.current] && (words[currentIndexRef.current].index === undefined || words[currentIndexRef.current].index === currentIndexRef.current) ? words[currentIndexRef.current] : words[0]);
    const initialDelay = currentWordObj
      ? calculateWordDelayMs(currentWordObj, effectiveWpm, settings.smartPunctuationPause, settings.smartPace)
      : (60 / effectiveWpm) * 1000;

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
    words.length > 0,
    effectiveTotalWords
  ]);

  const progressPercent = effectiveTotalWords > 0 ? Math.round(((currentIndex + 1) / effectiveTotalWords) * 100) : 0;
  const wordsRemaining = Math.max(0, effectiveTotalWords - 1 - currentIndex);
  const secondsRemaining = Math.round((wordsRemaining / Math.max(1, settings.wpm)) * 60);
  const remainingMins = Math.floor(secondsRemaining / 60);
  const remainingSecs = secondsRemaining % 60;
  const formattedTimeRemaining = remainingMins > 0 ? `${remainingMins}m ${remainingSecs}s` : `${remainingSecs}s`;

  // The targeted word for the floating marker highlighter pillow:
  // Follows the user's cursor position when hovering, or defaults to current reading word
  const targetWordIndex = hoveredWordIndex !== null ? hoveredWordIndex : currentIndex;

  const isTextRtl = words.length > 0 && Boolean(words[0]?.isRtl || words.some((w) => w?.isRtl));

  const scrubberRowHeight = useMemo(() => {
    if (!scrubberChapters || scrubberChapters.length === 0) return 10;
    return Math.max(5, Math.min(12, Math.floor(440 / Math.max(1, scrubberChapters.length))));
  }, [scrubberChapters]);

  return (
    <div className="flex flex-col flex-1 w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 justify-between h-full min-h-0 relative select-none">
      {/* Top Status & Context Info */}
      <div 
        className={`flex items-center justify-between gap-3 text-xs mb-3 transition-all duration-700 ease-out shrink-0 z-20 max-w-3xl mx-auto w-full ${
          isIdle ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md border ${theme.borderClass} ${theme.cardBgClass} font-mono font-medium ${theme.textPrimary}`}>
            {currentIndex + 1} <span className={theme.textMuted}>/ {effectiveTotalWords}</span>
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTimeRemaining} left</span>
          </span>
        </div>
      </div>

      {/* Chapter Scrubber Rail (Aligned directly to the middle of the text body) */}
      {scrubberChapters.length > 1 && (
        <aside
          id="flow-chapter-scrubber-rail"
          aria-label="Chapter and reading progress scrubber"
          className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center transition-all duration-500 ease-out pointer-events-auto ${
            isIdle ? 'opacity-30 hover:opacity-100' : 'opacity-100'
          }`}
          style={{
            left: isTextRtl ? undefined : `max(8px, calc(50% - 24rem - 58px))`,
            right: isTextRtl ? `max(8px, calc(50% - 24rem - 58px))` : undefined,
          }}
        >
          <ChapterScrubber
            chapters={scrubberChapters}
            currentIndex={currentScrubberIndex}
            onSelect={handleScrubberSelect}
            side={isTextRtl ? 'right' : 'left'}
            dir={isTextRtl ? 'rtl' : 'ltr'}
            disableAutoFlip={true}
            rowHeight={scrubberRowHeight}
            peakLength={48}
            restLength={14}
            radius={4}
            highlightHex={highlight.hex}
            className="py-2"
          />
        </aside>
      )}

      {/* Right Edge Vertical Toolbar */}
      <aside 
        id="flow-right-edge-toolbar"
        aria-label="Flow quick controls"
        className={`fixed right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 p-1.5 rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} backdrop-blur-md shadow-2xl transition-all duration-500 ease-out max-h-[calc(100vh-80px)] overflow-y-auto ${
          isIdle ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Word Size Controller (Vertical A+ / Size / A-) */}
        <div 
          id="flow-font-size-control-vertical"
          className={`flex flex-col items-center rounded-xl border ${theme.borderClass} ${theme.cardBgClass} p-1 text-xs font-mono shadow-xs w-11`}
          title={`Full text word size: ${settings.flowFontSize || 22}px`}
        >
          <button
            id="flow-font-increase-btn"
            type="button"
            onClick={() => onUpdateSettings({ flowFontSize: Math.min(52, (settings.flowFontSize || 22) + 2) })}
            title="Increase word size (+)"
            aria-label="Increase word size (+)"
            className={`w-full py-1 rounded-lg font-bold text-xs flex items-center justify-center ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer`}
          >
            <span className="text-[11px] font-bold">A+</span>
          </button>
          <span className={`py-0.5 text-[10px] font-mono font-bold ${theme.textPrimary}`}>
            {settings.flowFontSize || 22}
          </span>
          <button
            id="flow-font-decrease-btn"
            type="button"
            onClick={() => onUpdateSettings({ flowFontSize: Math.max(14, (settings.flowFontSize || 22) - 2) })}
            title="Decrease word size (-)"
            aria-label="Decrease word size (-)"
            className={`w-full py-1 rounded-lg font-bold text-xs flex items-center justify-center ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer`}
          >
            <span className="text-[11px] font-bold">A-</span>
          </button>
        </div>

        {/* Paragraph Blur Focus Toggle (Vertical) */}
        <button
          id="toggle-paragraph-blur-btn"
          type="button"
          onClick={() => onUpdateSettings({ focusParagraphBlur: !settings.focusParagraphBlur })}
          title={
            settings.focusParagraphBlur
              ? 'Paragraph Focus Blur: ON (Only active or hovered paragraph is unblurred)'
              : 'Paragraph Focus Blur: OFF (Click to focus on one paragraph at a time)'
          }
          aria-label="Toggle Paragraph Blur Focus"
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all shadow-xs w-11 cursor-pointer ${
            settings.focusParagraphBlur
              ? 'font-bold'
              : `${theme.borderClass} ${theme.cardBgClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
          }`}
          style={
            settings.focusParagraphBlur
              ? {
                  borderColor: `${highlight.hex}80`,
                  color: highlight.hex,
                  backgroundColor: `${highlight.hex}18`,
                }
              : undefined
          }
        >
          <Focus className="w-4 h-4" />
          <span className="text-[8px] font-semibold mt-0.5">Focus</span>
          <span className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold mt-0.5 ${
            settings.focusParagraphBlur ? 'bg-red-500/20 text-red-400' : 'bg-white/10'
          }`}>
            {settings.focusParagraphBlur ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Switch to RSVP View Button (Vertical) */}
        <button
          id="flow-switch-to-rsvp-btn"
          type="button"
          onClick={onSwitchToRsvp}
          title="Switch to Rapid Serial Visual Presentation (RSVP) Mode"
          aria-label="Switch to RSVP Mode"
          className={`flex flex-col items-center justify-center p-2 rounded-xl border ${theme.borderClass} ${theme.cardBgClass} ${theme.textPrimary} hover:${theme.accentSurface} transition-colors shadow-xs w-11 cursor-pointer`}
        >
          <Eye className="w-4 h-4 text-red-500" />
          <span className="text-[8px] font-semibold mt-0.5">RSVP</span>
        </button>
      </aside>

      {/* Main Reading Stage & Text Scroll Container (Item 1 & Item 5: Locked player panel, text itself scrolls on RSVP background) */}
      <div 
        ref={containerRef}
        id="flow-text-container"
        className={`flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 sm:py-8 select-text leading-relaxed relative ${font.className} scroll-smooth ${
          isTextRtl ? 'pr-12 sm:pr-16 pl-4 sm:pl-6' : 'pl-12 sm:pl-16 pr-12 sm:pr-16'
        }`}
        style={{
          fontSize: `${settings.flowFontSize || 22}px`,
          lineHeight: settings.lineHeight || 1.8,
          letterSpacing: `${resolveLetterSpacingEm(settings)}em`,
        }}
      >
        {/* Ambient Glow Focus Halo (Matching RSVP background) */}
        <div 
          className="absolute inset-0 max-w-2xl mx-auto rounded-full blur-3xl pointer-events-none opacity-10 transition-colors"
          style={{ backgroundColor: highlight.hex }}
        />

        {/* Flow Content Rendered by Paragraphs */}
        <LayoutGroup id="flow-reader-marker">
          <div 
            className={`max-w-3xl mx-auto relative z-10 ${isTextRtl && settings.fontFamily !== 'vazirmatn' ? 'font-vazirmatn' : ''}`}
            dir={isTextRtl ? 'rtl' : 'ltr'}
          >
            {/* Top Virtualization Spacer */}
            {topSpacerHeight > 0 && (
              <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" className="w-full" />
            )}

            {visibleGroups.map((group, groupIdx) => {
              // Determine if this paragraph is unblurred (Item 3)
              const isParagraphUnblurred =
                !settings.focusParagraphBlur ||
                group.paragraphIndex === hoveredParagraphIndex ||
                (hoveredParagraphIndex === null && group.paragraphIndex === activeParagraphIndex);

              return (
                <div
                  key={`para-${group.paragraphIndex}-${groupIdx}`}
                  ref={(el) => {
                    paragraphRefs.current[group.paragraphIndex] = el;
                  }}
                  onMouseEnter={() =>
                    setHoveredParagraphIndex((prev) =>
                      prev === group.paragraphIndex ? prev : group.paragraphIndex
                    )
                  }
                  className={`my-4 sm:my-6 transition-all duration-300 leading-relaxed relative ${
                    isParagraphUnblurred
                      ? 'opacity-100 blur-0'
                      : 'opacity-25 blur-[5px] select-none pointer-events-auto'
                  }`}
                  style={{ position: 'relative' }}
                >
                  {group.words.map((item) => {
                    const isTarget = item.globalIndex === targetWordIndex;
                    const isAudioCurrent = item.globalIndex === currentIndex;
                    const isPast = item.globalIndex < currentIndex;
                    const isBionic = settings.highlightStyle === 'bionic-prefix';
                    const hasWordParts = Boolean(item.word.highlightedText);

                    return (
                      <MarkerHighlight
                        key={`w-${item.globalIndex}`}
                        ref={isAudioCurrent ? activeWordRef : null}
                        highlight={item.word.original}
                        wordParts={isBionic && hasWordParts ? item.word : undefined}
                        markerColor={highlight.hex}
                        isRtl={Boolean(item.word.isRtl)}
                        isActive={isTarget}
                        isHovered={hoveredWordIndex === item.globalIndex}
                        wordIndex={item.globalIndex}
                        paragraphIndex={group.paragraphIndex}
                        onWordSelect={onIndexChange}
                        onWordHover={handleWordHover}
                        title={`Word #${item.globalIndex + 1}: Click to start reading here`}
                        className={`${
                          isPast && isPlaying
                            ? 'opacity-70 hover:opacity-100'
                            : `${theme.textPrimary} hover:text-white hover:bg-white/5`
                        }`}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Bottom Virtualization Spacer */}
            {bottomSpacerHeight > 0 && (
              <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" className="w-full" />
            )}
          </div>
        </LayoutGroup>
      </div>

      {/* Bottom Sticky Player Panel (Item 5: Locked on page; Item 8: Fades out after 5s mouse inactivity) */}
      <div 
        className={`mt-3 rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} p-4 shadow-lg flex flex-col gap-3 transition-all duration-700 ease-out shrink-0 z-20 ${
          isIdle ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Visual Reading Progress Indicator (Complexity Heatmap) */}
        {settings.showHeatmapProgress !== false && heatmapData && (
          <div className="pb-1 border-b border-white/5">
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
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="flow-restart-btn"
              type="button"
              onClick={onRestart}
              title="Restart from beginning"
              aria-label="Restart"
              className={`p-2.5 rounded-xl border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className={`text-xs font-mono ${theme.textMuted}`}>
              {progressPercent}% completed
            </span>
          </div>

          {/* Play/Pause (Metallic Shader UI) */}
          <MetallicButton
            id="flow-play-pause-btn"
            viewMode="icon"
            isPlaying={isPlaying}
            onClick={onTogglePlay}
            sheenColor={highlight.hex}
            title={isPlaying ? 'Pause Tracker (Space)' : 'Auto-Track Reading (Space)'}
          />

          {/* Audio Controls (Metronome + Voice-Over Narration) */}
          <div className="flex items-center gap-2">
            {/* Audio Metronome Toggle */}
            <button
              id="flow-metronome-toggle-btn"
              type="button"
              onClick={() => onUpdateSettings({ metronomeSound: !settings.metronomeSound })}
              title={settings.metronomeSound ? 'Metronome sound enabled (Click to mute)' : 'Enable rhythmic focus metronome'}
              aria-label="Toggle Metronome"
              className={`p-2.5 rounded-xl border transition-all ${
                settings.metronomeSound
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold shadow-xs'
                  : `${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
              }`}
            >
              {settings.metronomeSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Quick Voice-Over Narration Toggle */}
            <button
              id="flow-voice-toggle-btn"
              type="button"
              onClick={() => onUpdateSettings({ speechNarration: !settings.speechNarration })}
              title={settings.speechNarration ? 'Voice-Over Narration is ON (Click to turn off)' : 'Enable Voice-Over Audio Narration'}
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

        {/* Merged Speed Slider Toggle */}
        <div className={`pt-3 border-t ${theme.borderClass}`}>
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
          />
        </div>
      </div>
    </div>
  );
};
