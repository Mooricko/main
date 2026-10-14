import React, { useState, useRef, useCallback, useMemo } from 'react';
import { HighlightedWordParts, ReadingHeatmapData, ReaderSettings } from '../types';
import { ThemeConfig } from '../utils/themeStyles';
import { Flame } from 'lucide-react';

export interface VerticalProgressRailProps {
  currentIndex: number;
  totalWords: number;
  words?: HighlightedWordParts[];
  onIndexChange: (index: number) => void;
  settings: ReaderSettings;
  theme: ThemeConfig;
  highlightHex?: string;
  heatmapData?: ReadingHeatmapData;
  isIdle?: boolean;
  className?: string;
}

export const VerticalProgressRail: React.FC<VerticalProgressRailProps> = ({
  currentIndex,
  totalWords: customTotalWords,
  words,
  onIndexChange,
  settings,
  theme,
  highlightHex = '#ef4444',
  heatmapData,
  isIdle = false,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  const totalWords = customTotalWords > 0 ? customTotalWords : (words ? words.length : 1);
  const safeTotalWords = Math.max(1, totalWords);
  const progressPercent = Math.min(100, Math.max(0, ((currentIndex + 1) / safeTotalWords) * 100));
  const currentPositionPct = Math.min(100, Math.max(0, (currentIndex / Math.max(1, safeTotalWords - 1)) * 100));

  // Compute word index from vertical pointer Y coordinate
  const computeWordIndex = useCallback(
    (clientY: number): { index: number; pct: number } => {
      if (!trackRef.current) return { index: 0, pct: 0 };
      const rect = trackRef.current.getBoundingClientRect();
      const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const pct = rect.height > 0 ? relativeY / rect.height : 0;
      const index = Math.min(safeTotalWords - 1, Math.max(0, Math.round(pct * (safeTotalWords - 1))));
      return { index, pct };
    },
    [safeTotalWords]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }
    setIsDragging(true);
    const { index, pct } = computeWordIndex(e.clientY);
    setHoverPct(pct);
    onIndexChange(index);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const { index, pct } = computeWordIndex(e.clientY);
      setHoverPct(pct);
      onIndexChange(index);
    } else {
      const { pct } = computeWordIndex(e.clientY);
      setHoverPct(pct);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    setIsDragging(false);
  };

  const activeHoverWord = useMemo(() => {
    if (hoverPct === null) return currentIndex;
    return Math.min(safeTotalWords - 1, Math.max(0, Math.round(hoverPct * (safeTotalWords - 1))));
  }, [hoverPct, safeTotalWords, currentIndex]);

  const activeHoverPercent = useMemo(() => {
    if (hoverPct !== null) return Math.round(hoverPct * 100);
    return Math.round(progressPercent);
  }, [hoverPct, progressPercent]);

  // Compute remaining time estimate for hover tooltip
  const hoverWordsRemaining = Math.max(0, safeTotalWords - 1 - activeHoverWord);
  const hoverSecondsRemaining = Math.round((hoverWordsRemaining / Math.max(1, settings.wpm)) * 60);
  const hoverMinutesRemaining = Math.floor(hoverSecondsRemaining / 60);
  const hoverSecsPart = hoverSecondsRemaining % 60;
  const hoverTimeStr = hoverMinutesRemaining > 0 
    ? `${hoverMinutesRemaining}m ${hoverSecsPart}s` 
    : `${hoverSecsPart}s`;

  // Complex heatmap buckets mapped to vertical positions
  const complexMarkers = useMemo(() => {
    if (!heatmapData || settings.showHeatmapProgress === false || !heatmapData.buckets) return [];
    return heatmapData.buckets
      .filter((b) => b.complexityLevel === 'high' || b.complexityLevel === 'peak')
      .map((b) => ({
        topPct: (b.startWord / safeTotalWords) * 100,
        heightPct: Math.max(1, ((b.endWord - b.startWord + 1) / safeTotalWords) * 100),
        level: b.complexityLevel,
      }));
  }, [heatmapData, settings.showHeatmapProgress, safeTotalWords]);

  return (
    <div
      id="vertical-reading-progress-rail"
      aria-label="Vertical Reading Progress Rail"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={safeTotalWords - 1}
      aria-valuenow={currentIndex}
      aria-valuetext={`Word ${currentIndex + 1} of ${safeTotalWords}, ${Math.round(progressPercent)}% read`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setIsHovered(false);
          setHoverPct(null);
        }
      }}
      className={`fixed right-2 sm:right-4 md:right-5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 sm:w-10 h-[68vh] max-h-[520px] min-h-[240px] cursor-pointer touch-none select-none transition-all duration-500 group ${
        isIdle && !isHovered && !isDragging
          ? 'opacity-35 hover:opacity-100 scale-95 hover:scale-100'
          : 'opacity-85 hover:opacity-100'
      } ${className}`}
    >
      {/* Outer Glow Halo when Hovered or Scrubbing */}
      <div 
        className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-opacity duration-300 ${
          isHovered || isDragging ? 'opacity-25' : 'opacity-0'
        }`}
        style={{ backgroundColor: highlightHex }}
      />

      {/* Floating Scrub / Position Tooltip (Displayed to the left of the rail) */}
      {(isHovered || isDragging) && (
        <div
          className="absolute right-full mr-3.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-150 animate-in fade-in slide-in-from-right-1 flex flex-col items-end gap-0.5 whitespace-nowrap z-40 text-xs"
          style={{
            top: `${hoverPct !== null ? hoverPct * 100 : currentPositionPct}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span style={{ color: highlightHex }}>{activeHoverPercent}%</span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({activeHoverWord + 1} / {safeTotalWords})
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <span>{hoverTimeStr} left</span>
            {complexMarkers.some((m) => Math.abs(m.topPct - (hoverPct !== null ? hoverPct * 100 : currentPositionPct)) < 3) && (
              <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                <Flame className="w-2.5 h-2.5 fill-current" />
                Complex
              </span>
            )}
          </div>
        </div>
      )}

      {/* Vertical Rail Track */}
      <div
        ref={trackRef}
        className="relative w-1.5 sm:w-2 h-full rounded-full bg-slate-800/80 border border-white/10 overflow-hidden transition-all duration-200 group-hover:w-2.5 shadow-inner"
      >
        {/* Complex Heatmap Segment Markers along the track */}
        {complexMarkers.map((marker, idx) => (
          <div
            key={`complex-marker-${idx}`}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${marker.topPct}%`,
              height: `${marker.heightPct}%`,
              backgroundColor: marker.level === 'peak' ? '#ef4444' : '#f59e0b',
              opacity: 0.65,
            }}
          />
        ))}

        {/* Progress Fill (Top to Bottom) */}
        <div
          className="absolute top-0 left-0 right-0 rounded-full transition-all ease-out"
          style={{
            height: `${progressPercent}%`,
            backgroundColor: highlightHex,
            boxShadow: `0 0 10px ${highlightHex}80`,
            transitionDuration: isDragging ? '0ms' : '120ms',
          }}
        />
      </div>

      {/* Glowing Position Thumb / Bead */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all ease-out"
        style={{
          top: `${currentPositionPct}%`,
          transform: 'translate(-50%, -50%)',
          transitionDuration: isDragging ? '0ms' : '120ms',
        }}
      >
        <div
          className={`rounded-full transition-all duration-200 ${
            isHovered || isDragging
              ? 'w-4 h-4 shadow-lg scale-110'
              : 'w-3 h-3 shadow-md'
          }`}
          style={{
            backgroundColor: '#ffffff',
            border: `2px solid ${highlightHex}`,
            boxShadow: `0 0 8px ${highlightHex}, 0 0 16px ${highlightHex}60`,
          }}
        />
      </div>

      {/* Subtle Top & Bottom Caps */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20 pointer-events-none" />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20 pointer-events-none" />
    </div>
  );
};
