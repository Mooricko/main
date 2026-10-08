import React from 'react';
import { 
  BookOpen, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Eye,
  AlignLeft,
  Zap,
  Sun,
  Moon,
  Timer,
  BellOff,
  Activity
} from 'lucide-react';
import { ReaderSettings, ReaderViewMode } from '../types';
import { THEME_CONFIGS, HIGHLIGHT_COLORS } from '../utils/themeStyles';
import { KhoroosLogo } from './KhoroosLogo';

interface HeaderProps {
  settings: ReaderSettings;
  onUpdateSettings: (updater: Partial<ReaderSettings>) => void;
  viewMode: ReaderViewMode;
  onToggleViewMode: (mode: ReaderViewMode) => void;
  onOpenTextInput?: () => void;
  onOpenOverview?: () => void;
  onOpenSidebar?: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  onOpenExtensionHub: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  currentTitle: string;
  isIdle?: boolean;
  timerFormatted?: string;
  isTimerRunning?: boolean;
  isTimerSet?: boolean;
  onOpenTimerModal?: () => void;
  onOpenStatsModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onUpdateSettings,
  viewMode,
  onToggleViewMode,
  onOpenTextInput,
  onOpenOverview,
  onOpenSidebar,
  onOpenSettings,
  onOpenShortcuts,
  onOpenExtensionHub,
  isFullscreen,
  onToggleFullscreen,
  currentTitle,
  isIdle = false,
  timerFormatted = '00:00',
  isTimerRunning = false,
  isTimerSet = false,
  onOpenTimerModal,
  onOpenStatsModal,
}) => {
  const theme = THEME_CONFIGS[settings.theme];
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor];

  return (
    <header
      id="app-header"
      className={`w-full border-b ${theme.borderClass} ${theme.cardBgClass} transition-all duration-700 ease-out z-30 shrink-0 ${
        isIdle ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3">
        {/* Brand & Document Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-700/40 text-black shrink-0 shadow-sm overflow-hidden p-1 transition-transform hover:scale-105"
            title="Khoroos Reader"
          >
            <KhoroosLogo className="w-full h-full text-black" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight ${theme.textPrimary} truncate`}>
                Khoroos Reader
              </h1>
            </div>
            <p className={`text-xs ${theme.textMuted} truncate max-w-[200px] sm:max-w-xs md:max-w-md`}>
              {currentTitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reading Statistics & Analytics Button */}
          {onOpenStatsModal && (
            <button
              id="open-stats-modal-btn"
              type="button"
              onClick={onOpenStatsModal}
              title="Reading Statistics & Heatmap Analytics (Average WPM, words read, sessions)"
              aria-label="Reading Statistics"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-all shadow-xs`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Stats</span>
            </button>
          )}

          {/* Focus Timer Button */}
          {onOpenTimerModal && (
            <button
              id="open-timer-modal-btn"
              type="button"
              onClick={onOpenTimerModal}
              title={isTimerSet ? `Focus Session: ${timerFormatted} remaining (Click to configure)` : 'Start Focus Timer'}
              aria-label="Focus Timer"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isTimerSet
                  ? `${highlight.bgBadge} border font-mono shadow-xs`
                  : `${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
              }`}
            >
              <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'animate-pulse text-red-500' : ''}`} />
              <span className={isTimerSet ? 'font-mono' : 'hidden md:inline'}>
                {isTimerSet ? timerFormatted : 'Timer'}
              </span>
              {isTimerSet && settings.doNotDisturb && (
                <span title="Do Not Disturb Active">
                  <BellOff className="w-3 h-3 text-red-400" />
                </span>
              )}
            </button>
          )}

          {/* Dark / Light Mode Toggle Button */}
          <button
            id="toggle-dark-light-theme-btn"
            type="button"
            onClick={() => {
              const nextTheme = settings.theme === 'light' ? 'midnight' : 'light';
              onUpdateSettings({ theme: nextTheme });
            }}
            title={settings.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle Dark/Light Mode"
            className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
          >
            {settings.theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Help Button */}
          <button
            id="open-extension-hub-btn"
            type="button"
            onClick={onOpenExtensionHub}
            title="Help"
            aria-label="Help"
            className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors flex items-center justify-center`}
          >
            <span className="w-4 h-4 flex items-center justify-center text-xs font-bold leading-none select-none">
              ?
            </span>
          </button>

          {/* Settings Drawer Button */}
          <button
            id="open-settings-btn"
            type="button"
            onClick={onOpenSettings}
            title="Reader Customization & Typography"
            aria-label="Open Settings"
            className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Mode Button */}
          <button
            id="toggle-fullscreen-btn"
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Distraction-Free Fullscreen'}
            aria-label="Toggle Fullscreen"
            className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Switcher Under Header */}
      <div 
        id="mode-switcher-bar"
        className={`w-full border-t ${theme.borderClass} bg-black/10 py-1.5 px-4 flex items-center justify-center`}
      >
        <div className="flex items-center p-1 rounded-xl bg-black/20 border border-white/5 shadow-xs">
          <button
            id="view-mode-rsvp-btn"
            type="button"
            onClick={() => onToggleViewMode('rsvp')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'rsvp'
                ? `${highlight.bgBadge} border shadow-xs`
                : `${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Word by Word (RSVP)</span>
          </button>
          <button
            id="view-mode-flow-btn"
            type="button"
            onClick={() => onToggleViewMode('flow')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'flow'
                ? `${highlight.bgBadge} border shadow-xs`
                : `${theme.textMuted} hover:${theme.textPrimary}`
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Full Text Flow</span>
          </button>
        </div>
      </div>
    </header>
  );
};
