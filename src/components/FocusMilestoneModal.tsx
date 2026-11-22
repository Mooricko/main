import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Flame, 
  Trophy, 
  Clock, 
  BookOpen, 
  Zap, 
  Coffee, 
  Play, 
  ChevronRight, 
  CheckCircle2, 
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  FocusMilestone, 
  FocusMilestonesData, 
  FocusCompletedSession,
  getAllMilestonesProgress, 
  getNextUpcomingMilestone,
  FOCUS_MILESTONES
} from '../services/focus/focusMilestoneService';
import { ThemeConfig } from '../utils/themeStyles';
import { triggerFocusBlockConfetti, triggerMiniConfetti } from '../utils/confettiCelebration';

interface FocusMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestonesData: FocusMilestonesData;
  newlyUnlockedMilestones: FocusMilestone[];
  completedSession?: FocusCompletedSession;
  theme: ThemeConfig;
  highlightHex: string;
  onStartBreak?: (minutes: number) => void;
  onStartNextBlock?: (minutes: number) => void;
}

/**
 * Gentle celebratory audio chime via Web Audio API.
 * Non-blocking, fails gracefully if AudioContext is unavailable or muted.
 */
function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Major triad harmonic chime: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  } catch {
    // Ignore audio failures
  }
}

export const FocusMilestoneModal: React.FC<FocusMilestoneModalProps> = ({
  isOpen,
  onClose,
  milestonesData,
  newlyUnlockedMilestones,
  completedSession,
  theme,
  highlightHex,
  onStartBreak,
  onStartNextBlock,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'milestones'>('summary');

  // Trigger celebration chime on open if newly unlocked
  useEffect(() => {
    if (isOpen) {
      playCelebrationChime();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const nextMilestone = getNextUpcomingMilestone(milestonesData);
  const allMilestonesProgress = getAllMilestonesProgress(milestonesData);
  const unlockedCount = milestonesData.unlockedMilestoneIds.length;

  const sessionDuration = completedSession?.durationMinutes || 15;
  const sessionWords = completedSession?.wordsRead || 0;
  const sessionWpm = completedSession?.avgWpm || 0;
  const presetLabel = completedSession?.presetLabel || `${sessionDuration}m Focus Block`;

  const getTierColor = (tier: FocusMilestone['rewardTier']) => {
    switch (tier) {
      case 'platinum':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'gold':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'silver':
        return 'text-slate-300 bg-slate-500/10 border-slate-400/30';
      case 'bronze':
      default:
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    }
  };

  return (
    <div
      id="focus-milestone-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="focus-milestone-modal"
        className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border ${theme.borderClass} ${theme.cardBgClass} shadow-2xl overflow-hidden animate-modal-slide-fade`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with celebration banner */}
        <div className={`relative px-6 py-5 border-b ${theme.borderClass} shrink-0 overflow-hidden`}>
          {/* Subtle glowing radial background */}
          <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-36 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ backgroundColor: highlightHex }}
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border"
                style={{ 
                  backgroundColor: `${highlightHex}20`, 
                  borderColor: `${highlightHex}40`,
                }}
              >
                🎉
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-base sm:text-lg font-bold tracking-tight ${theme.textPrimary}`}>
                    Focus Session Complete!
                  </h3>
                  <span 
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider border shadow-xs"
                    style={{
                      backgroundColor: `${highlightHex}15`,
                      borderColor: `${highlightHex}30`,
                      color: highlightHex,
                    }}
                  >
                    {presetLabel}
                  </span>
                </div>
                <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                  Cognitive focus block successfully finished. Take a moment to celebrate your momentum!
                </p>
              </div>
            </div>

            <button
              id="close-milestone-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close Milestone Modal"
              className={`p-2 rounded-xl border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer shrink-0 ml-2`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs (Summary vs All Milestones) */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'summary'
                  ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                  : `${theme.textMuted} hover:${theme.textPrimary}`
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Session Recap & Milestones</span>
              {newlyUnlockedMilestones.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'milestones'
                  ? 'bg-white/10 text-white border border-white/15 shadow-xs'
                  : `${theme.textMuted} hover:${theme.textPrimary}`
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>All Milestones ({unlockedCount}/{FOCUS_MILESTONES.length})</span>
            </button>

            <div className="ml-auto">
              <button
                type="button"
                onClick={() => triggerFocusBlockConfetti(highlightHex)}
                title="Celebrate again with confetti!"
                className={`p-1.5 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-all active:scale-95 text-xs flex items-center gap-1 cursor-pointer`}
              >
                <span>🎊</span>
                <span className="hidden sm:inline text-[11px] font-medium">Confetti</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {activeTab === 'summary' ? (
            <>
              {/* Newly Unlocked Milestone Banner (if any) */}
              {newlyUnlockedMilestones.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      New Milestone Unlocked!
                    </span>
                  </div>

                  {newlyUnlockedMilestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/5 shadow-lg relative overflow-hidden flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-md shrink-0">
                        {m.badge}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-white">
                            {m.title}
                          </h4>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase border ${getTierColor(m.rewardTier)}`}>
                            {m.rewardTier}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {m.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Session Performance Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`p-3 rounded-xl border ${theme.borderClass} ${theme.inputBg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Duration
                    </span>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="mt-2">
                    <span className={`text-xl font-bold font-mono ${theme.textPrimary}`}>
                      {sessionDuration}m
                    </span>
                    <span className={`text-[10px] block ${theme.textMuted}`}>
                      Deep Focus
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${theme.borderClass} ${theme.inputBg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Words Read
                    </span>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <span className={`text-xl font-bold font-mono ${theme.textPrimary}`}>
                      {sessionWords.toLocaleString()}
                    </span>
                    <span className={`text-[10px] block ${theme.textMuted}`}>
                      in this block
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${theme.borderClass} ${theme.inputBg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Cadence
                    </span>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <span className={`text-xl font-bold font-mono ${theme.textPrimary}`}>
                      {sessionWpm || '—'}
                    </span>
                    <span className={`text-[10px] block ${theme.textMuted}`}>
                      Words / Min
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${theme.borderClass} ${theme.inputBg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted}`}>
                      Today
                    </span>
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="mt-2">
                    <span className={`text-xl font-bold font-mono ${theme.textPrimary}`}>
                      #{milestonesData.todayBlocksCount}
                    </span>
                    <span className={`text-[10px] block ${theme.textMuted}`}>
                      {milestonesData.currentStreakDays}-day streak 🔥
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Milestone Progress Roadmap */}
              {nextMilestone && (
                <div className={`p-4 rounded-xl border ${theme.borderClass} ${theme.inputBg} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{nextMilestone.milestone.badge}</span>
                      <div>
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.textMuted} block`}>
                          Next Milestone Target
                        </span>
                        <h4 className={`text-xs sm:text-sm font-bold ${theme.textPrimary}`}>
                          {nextMilestone.milestone.title}
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {nextMilestone.progressPercent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-black/40 border border-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${nextMilestone.progressPercent}%`,
                        backgroundColor: highlightHex,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className={theme.textMuted}>
                      {nextMilestone.milestone.description}
                    </span>
                    <span className="font-mono font-semibold text-white shrink-0 ml-2">
                      {nextMilestone.currentValue} / {nextMilestone.milestone.target} {nextMilestone.milestone.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* ADHD Mindful Dopamine Encouragement */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3">
                <span className="text-2xl shrink-0">🧠</span>
                <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                  <strong className="text-white">Cognitive Rest Protocol:</strong> Your brain consolidates short-term comprehension best when paired with 5-minute restorative breaks. Stand up, hydrate, or look 20 feet away!
                </p>
              </div>
            </>
          ) : (
            /* Tab 2: All Milestones Grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${theme.textPrimary}`}>
                  Focus Reading Milestones
                </span>
                <span className={theme.textMuted}>
                  {unlockedCount} of {FOCUS_MILESTONES.length} Unlocked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {allMilestonesProgress.map(({ milestone, isUnlocked, currentValue, progressPercent }) => (
                  <div
                    key={milestone.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      isUnlocked
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : `${theme.borderClass} ${theme.inputBg} opacity-80`
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0 border ${
                        isUnlocked
                          ? 'border-emerald-500/40 bg-emerald-500/20'
                          : 'border-white/10 bg-black/20 grayscale opacity-60'
                      }`}>
                        {milestone.badge}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className={`text-xs font-bold truncate ${isUnlocked ? 'text-white' : theme.textPrimary}`}>
                            {milestone.title}
                          </h5>
                          {isUnlocked ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-medium text-slate-400 shrink-0">
                              {progressPercent}%
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] ${theme.textMuted} mt-0.5 line-clamp-2`}>
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    {/* Miniature Progress Bar */}
                    {!isUnlocked && (
                      <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-2.5 px-6 py-4 border-t ${theme.borderClass} ${theme.accentSurface} shrink-0`}>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onStartBreak && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartBreak(5);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>Take 5m Break</span>
              </button>
            )}

            {onStartNextBlock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartNextBlock(sessionDuration);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Play className="w-3 h-3 fill-current text-emerald-400" />
                <span>Another {sessionDuration}m</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-white text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            style={{ backgroundColor: highlightHex }}
          >
            <span>Continue Reading</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusMilestoneModal;
