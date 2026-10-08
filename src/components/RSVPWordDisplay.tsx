import React, { useLayoutEffect, useRef, useState } from 'react';
import { HighlightedWordParts, ReaderSettings } from '../types';
import { ThemeConfig, resolveLetterSpacingEm } from '../utils/themeStyles';
import { calculateWordDelayMs } from '../utils/textParser';
import { HorizontalRSVPReel } from './HorizontalRSVPReel';

export interface RSVPWordDisplayProps {
  currentWord: HighlightedWordParts;
  currentIndex: number;
  allWords?: HighlightedWordParts[];
  getWordAt?: (index: number) => HighlightedWordParts | undefined;
  totalWords?: number;
  isPlaying: boolean;
  settings: ReaderSettings;
  theme: ThemeConfig;
  highlight: { hex: string; bgBadge: string };
  font: { className: string };
  onIndexChange?: (index: number) => void;
}

export const RSVPWordDisplay: React.FC<RSVPWordDisplayProps> = ({
  currentWord,
  currentIndex,
  allWords = [],
  getWordAt,
  totalWords,
  isPlaying,
  settings,
  theme,
  highlight,
  font,
  onIndexChange,
}) => {
  // Refs for standard RSVP display
  const standardWordRef = useRef<HTMLDivElement>(null);
  const standardHighlightRef = useRef<HTMLSpanElement>(null);
  const [standardOffset, setStandardOffset] = useState<number>(0);

  // Helper to compute middle offset for highlighted letters relative to word center
  const computeMiddleOffset = (wordEl: HTMLElement | null, hlEl: HTMLElement | null): number => {
    if (!wordEl || !hlEl) return 0;
    const wordRect = wordEl.getBoundingClientRect();
    const hlRect = hlEl.getBoundingClientRect();
    if (wordRect.width === 0 || hlRect.width === 0) {
      const wordCenter = wordEl.offsetWidth / 2;
      const hlCenter = hlEl.offsetLeft + hlEl.offsetWidth / 2;
      return wordCenter - hlCenter;
    }
    const wordCenter = wordRect.left + wordRect.width / 2;
    const hlCenter = hlRect.left + hlRect.width / 2;
    return wordCenter - hlCenter;
  };

  // Synchronously compute and apply the middle offset before browser paints
  useLayoutEffect(() => {
    const wordEl = standardWordRef.current;
    const hlEl = standardHighlightRef.current;

    const offset = settings.opticalCenterLock ? computeMiddleOffset(wordEl, hlEl) : 0;
    setStandardOffset(offset);

    if (wordEl) {
      wordEl.style.setProperty('--rsvp-offset', offset !== 0 ? `translateX(${offset}px)` : 'translateX(0px)');
      wordEl.style.transform = offset !== 0 ? `translateX(${offset}px)` : 'translateX(0px)';
    }
  }, [
    currentIndex,
    settings.opticalCenterLock,
    settings.fontSize,
    settings.letterSpacing,
    settings.letterSpacingPreset,
    currentWord.original,
    currentWord.beforeHighlight,
    currentWord.highlightedText,
    currentWord.afterHighlight,
  ]);

  // Calculate gentle fade duration for standard mode
  const standardDelay = calculateWordDelayMs(
    currentWord,
    settings.wpm,
    settings.smartPunctuationPause
  );
  const isFadingZoom = settings.fadingZoomEntrance !== false;
  const fadeDurationMs = isPlaying
    ? Math.min(140, Math.max(isFadingZoom ? 60 : 50, standardDelay * 0.28))
    : (isFadingZoom ? 180 : 160);

  // Multi-Word Horizontal Looping Reel (1, 3, or 5 Words Aligned Horizontally with GSAP Swipe)
  if (settings.chunkSize && settings.chunkSize > 1) {
    return (
      <HorizontalRSVPReel
        words={allWords && allWords.length > 0 ? allWords : [currentWord]}
        getWordAt={getWordAt}
        totalWords={totalWords}
        currentIndex={currentIndex}
        chunkSize={settings.chunkSize as 1 | 3 | 5}
        isPlaying={isPlaying}
        settings={settings}
        theme={theme}
        highlight={highlight}
        font={font}
        onIndexChange={onIndexChange}
      />
    );
  }

  // Standard RSVP Mode (Comfortable CSS Fade-In Animation)
  return (
    <div
      id="rsvp-word-display"
      className={`relative w-full flex items-baseline justify-center tracking-normal overflow-visible select-none ${
        currentWord.isRtl && settings.fontFamily !== 'vazirmatn' ? 'font-vazirmatn' : font.className
      }`}
      style={{
        fontSize: `${settings.fontSize}px`,
        lineHeight: 1.2,
        letterSpacing: `${resolveLetterSpacingEm(settings)}em`,
      }}
    >
      <div
        key={currentIndex}
        ref={standardWordRef}
        dir={currentWord.isRtl ? 'rtl' : 'ltr'}
        className={`inline-block text-center whitespace-nowrap will-change-transform ${
          isFadingZoom ? 'animate-rsvp-fade-zoom' : 'animate-rsvp-fade-in'
        }`}
        style={{
          transform:
            settings.opticalCenterLock && standardOffset !== 0
              ? `translateX(${standardOffset}px)`
              : undefined,
          animationDuration: `${fadeDurationMs}ms`,
        }}
      >
        <span className={theme.textPrimary}>{currentWord.prefixPunct + currentWord.beforeHighlight}</span>
        <span
          ref={standardHighlightRef}
          className={
            currentWord.isRtl
              ? 'font-bold transition-colors'
              : 'font-bold px-[0.5px] transition-colors'
          }
          style={{ color: highlight.hex }}
        >
          {currentWord.highlightedText}
        </span>
        <span className={theme.textPrimary}>{currentWord.afterHighlight + currentWord.suffixPunct}</span>
      </div>
    </div>
  );
};
