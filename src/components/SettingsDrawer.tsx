import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDialogFocusTrap, isTopmostDialog } from '../hooks/useDialogFocusTrap';
import {
  X,
  Search,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  Headphones,
  Play,
  Sun,
  Moon,
  Timer,
  BellOff,
  Bell,
  Flame,
  MoveHorizontal,
  Download,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Activity,
  Globe,
} from 'lucide-react';
import {
  ReaderSettings,
  HighlightColor,
  HighlightStyle,
  ThemeId,
  FontFamily,
  LetterSpacingPreset,
  WarmupStatus,
} from '../types';
import {
  THEME_CONFIGS,
  HIGHLIGHT_COLORS,
  FONT_CONFIGS,
  LETTER_SPACING_PRESETS,
  resolveLetterSpacingPreset,
} from '../utils/themeStyles';
import { speechNarrator, VoiceOption } from '../utils/speechNarration';
import { DRIFT_INTENSITY_CONFIGS } from '../utils/driftAnimation';
import { farsiOfflineTts } from '../services/tts/farsiOfflineTTS';
import { PiperCacheInfo, FarsiTtsEngineType, CustomTtsConfig } from '../services/tts/types';
import {
  loadCustomTtsConfig,
  saveCustomTtsConfig,
  clearCustomTtsConfig,
  DEFAULT_CUSTOM_TTS_CONFIG,
} from '../services/tts/customTtsConfig';
import {
  SETTINGS_TABS,
  SettingsTabId,
  SettingItemId,
  filterSettingsCatalog,
} from '../utils/settingsCatalog';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (updater: Partial<ReaderSettings>) => void;
  onResetDefaults: () => void;
  onOpenTimerModal?: () => void;
  warmupStatus?: WarmupStatus;
  onResetWarmup?: () => void;
  isFarsiContent?: boolean;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
  onOpenTimerModal,
  warmupStatus,
  onResetWarmup,
  isFarsiContent = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const isSpeechSupported = speechNarrator.isSupported();

  // Smart Language Detection: Auto-detect Farsi vs English based on input text
  const [selectedTtsLang, setSelectedTtsLang] = useState<'english' | 'farsi'>(() =>
    isFarsiContent ? 'farsi' : 'english'
  );

  useEffect(() => {
    setSelectedTtsLang(isFarsiContent ? 'farsi' : 'english');
  }, [isFarsiContent]);

  // Clear search filter when drawer closes so re-opening starts fresh
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // English Custom Endpoint State
  const [englishCustomConfig, setEnglishCustomConfig] = useState<CustomTtsConfig>(DEFAULT_CUSTOM_TTS_CONFIG);
  const [englishCustomKeyInput, setEnglishCustomKeyInput] = useState('');
  const [isEnglishCustomTesting, setIsEnglishCustomTesting] = useState(false);
  const [englishTtsNotice, setEnglishTtsNotice] = useState<string | null>(null);

  // Dual-Engine Offline Farsi TTS & Farsi Custom Endpoint State
  const [piperCache, setPiperCache] = useState<PiperCacheInfo>({
    status: 'not_cached',
    modelName: 'fa_IR-amir-medium',
    sizeBytes: 0,
    downloadProgress: 0,
    isOfflineReady: false,
  });
  const [isFarsiPreviewPlaying, setIsFarsiPreviewPlaying] = useState(false);
  const [farsiTtsNotice, setFarsiTtsNotice] = useState<string | null>(null);
  const [farsiCustomConfig, setFarsiCustomConfig] = useState<CustomTtsConfig>(DEFAULT_CUSTOM_TTS_CONFIG);
  const [farsiCustomKeyInput, setFarsiCustomKeyInput] = useState('');
  const [isFarsiCustomTesting, setIsFarsiCustomTesting] = useState(false);

  useEffect(() => {
    const unsub = farsiOfflineTts.subscribePiperCache((info) => {
      setPiperCache(info);
    });

    loadCustomTtsConfig('english').then((cfg) => {
      if (cfg) {
        setEnglishCustomConfig({ ...DEFAULT_CUSTOM_TTS_CONFIG, ...cfg });
        setEnglishCustomKeyInput(cfg.apiKey || '');
      }
    });

    loadCustomTtsConfig('farsi').then((cfg) => {
      if (cfg) {
        setFarsiCustomConfig({ ...DEFAULT_CUSTOM_TTS_CONFIG, ...cfg });
        setFarsiCustomKeyInput(cfg.apiKey || '');
      }
    });

    return unsub;
  }, []);

  const currentFarsiEngine = settings.farsiTtsEngine || farsiOfflineTts.getActiveEngine();

  // English Custom Endpoint Handlers
  const handleSaveEnglishCustomConfig = async () => {
    const result = await saveCustomTtsConfig(
      { ...englishCustomConfig, apiKey: englishCustomKeyInput.trim() },
      'english'
    );
    if (result.valid === true) {
      setEnglishCustomConfig(result.config);
      setEnglishCustomKeyInput(result.config.apiKey);
      onUpdateSettings({ speechVoiceURI: 'english-custom' });
      setEnglishTtsNotice('English Custom TTS endpoint saved and selected.');
      setTimeout(() => setEnglishTtsNotice(null), 3500);
    } else {
      setEnglishTtsNotice(result.error);
    }
  };

  const handleTestEnglishCustomEndpoint = async () => {
    setIsEnglishCustomTesting(true);
    setEnglishTtsNotice('Testing English custom endpoint connection...');
    try {
      const result = await saveCustomTtsConfig(
        { ...englishCustomConfig, apiKey: englishCustomKeyInput.trim() },
        'english'
      );
      if (result.valid === false) {
        setEnglishTtsNotice(result.error);
        setIsEnglishCustomTesting(false);
        return;
      }
      setEnglishCustomConfig(result.config);
      await farsiOfflineTts.preview(
        'custom',
        1.0,
        settings.speechPitch || 1.0,
        settings.speechVolume,
        (fallbackReason) => {
          setEnglishTtsNotice(`Fallback notice: ${fallbackReason}`);
        },
        'English Custom TTS endpoint connected successfully! Audio narration is ready for reading.'
      );
      setEnglishTtsNotice('English Custom TTS endpoint test succeeded.');
      setTimeout(() => setEnglishTtsNotice(null), 4000);
    } catch (err: any) {
      setEnglishTtsNotice(`English Custom TTS error: ${err?.message || 'Connection failed'}`);
    } finally {
      setTimeout(() => setIsEnglishCustomTesting(false), 2600);
    }
  };

  const handleClearEnglishCustomConfig = async () => {
    await clearCustomTtsConfig('english');
    setEnglishCustomConfig(DEFAULT_CUSTOM_TTS_CONFIG);
    setEnglishCustomKeyInput('');
    setEnglishTtsNotice('English Custom TTS endpoint cleared.');
    setTimeout(() => setEnglishTtsNotice(null), 3000);
  };

  // Farsi Engine & Custom Endpoint Handlers
  const handleSelectFarsiEngine = (engine: FarsiTtsEngineType) => {
    farsiOfflineTts.setEngine(engine);
    const voiceURI =
      engine === 'piper'
        ? 'farsi-piper-neural'
        : engine === 'espeak'
          ? 'farsi-espeak-wasm'
          : 'farsi-custom';
    onUpdateSettings({ farsiTtsEngine: engine, speechVoiceURI: voiceURI });
    if (engine === 'piper' && !piperCache.isOfflineReady) {
      setFarsiTtsNotice(
        'Piper neural model not yet cached. It will automatically fall back to eSpeak NG WASM until downloaded.'
      );
    } else if (engine === 'custom') {
      setFarsiTtsNotice('Farsi custom endpoint selected. Configure and test your Persian model below.');
    } else {
      setFarsiTtsNotice(null);
    }
  };

  const handleSaveFarsiCustomConfig = async () => {
    const result = await saveCustomTtsConfig(
      { ...farsiCustomConfig, apiKey: farsiCustomKeyInput.trim() },
      'farsi'
    );
    if (result.valid === true) {
      setFarsiCustomConfig(result.config);
      setFarsiCustomKeyInput(result.config.apiKey);
      onUpdateSettings({ farsiTtsEngine: 'custom', speechVoiceURI: 'farsi-custom' });
      setFarsiTtsNotice('تنظیمات موتور سفارشی فارسی ذخیره و انتخاب شد.');
      setTimeout(() => setFarsiTtsNotice(null), 3500);
    } else {
      setFarsiTtsNotice(result.error);
    }
  };

  const handleTestFarsiCustomEndpoint = async () => {
    setIsFarsiCustomTesting(true);
    setFarsiTtsNotice('در حال آزمایش اتصال به سرور سفارشی فارسی...');
    try {
      const result = await saveCustomTtsConfig(
        { ...farsiCustomConfig, apiKey: farsiCustomKeyInput.trim() },
        'farsi'
      );
      if (result.valid === false) {
        setFarsiTtsNotice(result.error);
        setIsFarsiCustomTesting(false);
        return;
      }
      setFarsiCustomConfig(result.config);
      await farsiOfflineTts.preview(
        'custom',
        settings.farsiTtsSpeed || 1.0,
        settings.farsiTtsPitch || 1.0,
        settings.speechVolume,
        (fallbackReason) => {
          setFarsiTtsNotice(`پیام فال‌بک: ${fallbackReason}`);
        },
        'ارتباط با مدل اختصاصی گفتار فارسی با موفقیت برقرار شد. خوانش ریتمیک آماده است.'
      );
      setFarsiTtsNotice('تست اتصال به موتور سفارشی فارسی موفقیت‌آمیز بود.');
      setTimeout(() => setFarsiTtsNotice(null), 4000);
    } catch (err: any) {
      setFarsiTtsNotice(`خطای موتور سفارشی فارسی: ${err?.message || 'عدم برقراری ارتباط'}`);
    } finally {
      setTimeout(() => setIsFarsiCustomTesting(false), 2600);
    }
  };

  const handleClearFarsiCustomConfig = async () => {
    await clearCustomTtsConfig('farsi');
    setFarsiCustomConfig(DEFAULT_CUSTOM_TTS_CONFIG);
    setFarsiCustomKeyInput('');
    setFarsiTtsNotice('تنظیمات موتور اختصاصی فارسی پاک شد.');
    setTimeout(() => setFarsiTtsNotice(null), 3000);
  };

  const handleDownloadPiper = async () => {
    setFarsiTtsNotice('Downloading Piper Farsi model to offline IndexedDB cache...');
    const success = await farsiOfflineTts.downloadPiperModel();
    if (success) {
      setFarsiTtsNotice('Piper Neural Farsi model cached in IndexedDB and ready offline.');
      setTimeout(() => setFarsiTtsNotice(null), 5000);
    } else {
      setFarsiTtsNotice('Model download failed. Fallback to eSpeak NG WASM is active.');
    }
  };

  const handleClearPiperCache = async () => {
    await farsiOfflineTts.clearPiperCache();
    setFarsiTtsNotice('Piper offline cache cleared.');
    setTimeout(() => setFarsiTtsNotice(null), 3000);
  };

  const handleTestFarsiOfflineTts = async () => {
    setIsFarsiPreviewPlaying(true);
    try {
      await farsiOfflineTts.preview(
        currentFarsiEngine,
        settings.farsiTtsSpeed || 1.0,
        settings.farsiTtsPitch || 1.0,
        settings.speechVolume,
        (fallbackReason) => {
          setFarsiTtsNotice(fallbackReason);
        }
      );
    } catch (err: any) {
      setFarsiTtsNotice(`Error: ${err?.message || 'Synthesis failed'}`);
    } finally {
      setTimeout(() => setIsFarsiPreviewPlaying(false), 2600);
    }
  };

  useEffect(() => {
    if (!isSpeechSupported) return;
    setAvailableVoices(speechNarrator.getVoices());
    const unsub = speechNarrator.onVoicesChanged(() => {
      setAvailableVoices(speechNarrator.getVoices());
    });
    return unsub;
  }, [isSpeechSupported]);

  const handlePreviewVoice = () => {
    if (!isSpeechSupported) return;
    setIsPreviewPlaying(true);
    speechNarrator.previewVoice(
      settings.speechVoiceURI || '',
      settings.speechPitch || 1.0,
      1.0,
      settings.speechVolume
    );
    setTimeout(() => {
      setIsPreviewPlaying(false);
    }, 2800);
  };

  const drawerRef = useRef<HTMLElement>(null);

  useDialogFocusTrap({
    isOpen,
    containerRef: drawerRef,
    onClose,
  });

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!isTopmostDialog(drawerRef.current)) return;

      const target = event.target as HTMLElement;
      if (target?.closest?.('#open-settings-btn')) return;

      if (drawerRef.current && !drawerRef.current.contains(target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const handleSelectTab = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    if (searchQuery) {
      setSearchQuery('');
    }
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollTop = 0;
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const searchResult = useMemo(() => filterSettingsCatalog(searchQuery), [searchQuery]);
  const activeTabMeta = useMemo(
    () => SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0],
    [activeTab]
  );

  const theme = THEME_CONFIGS[settings.theme];
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor];
  const isLightSurface = settings.theme === 'light' || settings.theme === 'sepia';

  const rowSurfaceClass = `rounded-xl border ${theme.borderClass} ${theme.accentSurface}`;
  const inputFieldClass = `w-full px-2.5 py-1.5 rounded-lg border ${theme.borderClass} ${theme.inputBg} ${theme.textPrimary} text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors`;

  const renderSettingItem = (id: SettingItemId): React.ReactNode => {
    switch (id) {
      case 'theme':
        return (
          <div key={id} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-semibold ${theme.textPrimary}`}>
                Color Mode & Theme
              </label>
              <span className={`text-xs font-mono tabular-nums ${theme.textMuted}`}>
                {settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>

            <div className={`grid grid-cols-2 p-1 rounded-xl border ${theme.borderClass} ${theme.accentSurface} gap-1`}>
              <button
                type="button"
                id="settings-dark-mode-btn"
                onClick={() => {
                  if (settings.theme === 'light') {
                    onUpdateSettings({ theme: 'midnight' });
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  settings.theme !== 'light'
                    ? 'bg-slate-900 text-white shadow-xs border border-white/10'
                    : `${theme.textMuted} hover:${theme.textPrimary}`
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                id="settings-light-mode-btn"
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  settings.theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : `${theme.textMuted} hover:${theme.textPrimary}`
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {(Object.keys(THEME_CONFIGS) as ThemeId[]).map((themeKey) => {
                const thm = THEME_CONFIGS[themeKey];
                const isSelected = settings.theme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: themeKey })}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? `border-red-500 ring-1 ring-red-500/30 ${theme.cardBgClass}`
                        : `${theme.borderClass} ${theme.accentSurface} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-400/40"
                        style={{ backgroundColor: thm.hexBg }}
                      />
                      <span className={`${theme.textPrimary} truncate`}>{thm.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'highlight-color':
        return (
          <div key={id} className="space-y-2.5">
            <label className={`block text-xs font-semibold ${theme.textPrimary}`}>
              Highlight Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((colKey) => {
                const col = HIGHLIGHT_COLORS[colKey];
                const isSelected = settings.highlightColor === colKey;
                return (
                  <button
                    key={colKey}
                    type="button"
                    onClick={() => onUpdateSettings({ highlightColor: colKey })}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? `${col.bgBadge} border font-bold shadow-xs`
                        : `${theme.borderClass} ${theme.accentSurface} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="truncate">{col.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'highlight-pattern':
        return (
          <div key={id} className="space-y-2.5">
            <label className={`block text-xs font-semibold ${theme.textPrimary}`}>
              Highlight Pattern
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'middle-two' as HighlightStyle,
                  label: 'Two Middle Letters',
                  example: 're[ad]er',
                  desc: 'Locks vision onto the center 2 characters of each word',
                },
                {
                  id: 'middle-single' as HighlightStyle,
                  label: 'Single Middle Letter',
                  example: 'fo[c]us',
                  desc: 'Pinpoint focus at the exact mathematical center',
                },
                {
                  id: 'bionic-prefix' as HighlightStyle,
                  label: 'Bionic Prefix Guide',
                  example: '[rea]der',
                  desc: 'Highlights the first 40% to initiate rapid word recognition',
                },
              ].map((styleOpt) => {
                const isSelected = settings.highlightStyle === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ highlightStyle: styleOpt.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${highlight.bgBadge} border shadow-xs`
                        : `${theme.borderClass} ${theme.accentSurface} hover:border-slate-500/40`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-semibold ${isSelected ? highlight.textClass : theme.textPrimary}`}>
                        {styleOpt.label}
                      </span>
                      <span className={`font-mono text-xs font-semibold ${highlight.textClass}`}>
                        {styleOpt.example}
                      </span>
                    </div>
                    <p className={`text-xs ${theme.textMuted}`}>{styleOpt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'font-family':
        return (
          <div key={id} className="space-y-2.5">
            <label className={`block text-xs font-semibold ${theme.textPrimary}`}>
              Reading Font Family
            </label>
            <div className="space-y-1.5">
              {(Object.keys(FONT_CONFIGS) as FontFamily[]).map((fontKey) => {
                const f = FONT_CONFIGS[fontKey];
                const isSelected = settings.fontFamily === fontKey;
                return (
                  <button
                    key={fontKey}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: fontKey })}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? `${highlight.bgBadge} border font-semibold shadow-xs`
                        : `${theme.borderClass} ${theme.accentSurface} hover:border-slate-500/40`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold ${f.className} ${theme.textPrimary}`}>
                        {f.name}
                      </div>
                      <div className={`text-[11px] ${theme.textMuted}`}>{f.description}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-red-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'rsvp-font-size':
        return (
          <div key={id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="rsvp-font-size-slider" className={`font-semibold ${theme.textPrimary}`}>
                RSVP Word Size
              </label>
              <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                {settings.fontSize}px
              </span>
            </div>
            <input
              id="rsvp-font-size-slider"
              type="range"
              min="32"
              max="96"
              step="2"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-red-500`}
            />
          </div>
        );

      case 'flow-font-size':
        return (
          <div key={id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="flow-font-size-slider" className={`font-semibold ${theme.textPrimary}`}>
                Full Text Flow Word Size
              </label>
              <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                {settings.flowFontSize || 22}px
              </span>
            </div>
            <input
              id="flow-font-size-slider"
              type="range"
              min="14"
              max="48"
              step="2"
              value={settings.flowFontSize || 22}
              onChange={(e) => onUpdateSettings({ flowFontSize: parseInt(e.target.value, 10) })}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-red-500`}
            />
          </div>
        );

      case 'letter-spacing': {
        const activeLetterSpacingPreset = resolveLetterSpacingPreset(settings);
        return (
          <div key={id} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${theme.textPrimary}`}>Letter Spacing Preset</span>
              <span className={`font-mono tabular-nums font-semibold capitalize ${theme.textPrimary}`}>
                {activeLetterSpacingPreset} ({LETTER_SPACING_PRESETS[activeLetterSpacingPreset].valueEm}em)
              </span>
            </div>
            <div
              id="letter-spacing-preset-toggle"
              role="group"
              aria-label="Letter spacing presets"
              className={`grid grid-cols-3 p-1 rounded-xl border ${theme.borderClass} ${theme.accentSurface} gap-1`}
            >
              {(['compact', 'comfortable', 'generous'] as LetterSpacingPreset[]).map((presetKey) => {
                const preset = LETTER_SPACING_PRESETS[presetKey];
                const isSelected = activeLetterSpacingPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    id={`letter-spacing-${presetKey}-btn`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      onUpdateSettings({
                        letterSpacingPreset: presetKey,
                        letterSpacing: preset.valueEm,
                      })
                    }
                    className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected ? 'text-white shadow-xs' : `${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                    style={isSelected ? { backgroundColor: highlight.hex } : undefined}
                    title={preset.description}
                  >
                    <span className="font-semibold capitalize">{preset.name}</span>
                    <span className="text-[10px] opacity-85 font-mono tabular-nums">
                      {preset.valueEm === 0 ? '0em' : `+${preset.valueEm}em`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'rsvp-chunks':
        return (
          <div key={id} className={`p-3.5 ${rowSurfaceClass} space-y-2.5`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={`text-xs font-semibold ${theme.textPrimary}`}>RSVP Words Per Flash</div>
                <div className={`text-[11px] ${theme.textMuted}`}>
                  Choose 1, 3, or 5 words shown at once with smooth transitions
                </div>
              </div>
              <span className={`font-mono tabular-nums text-xs font-semibold shrink-0 ${highlight.textClass}`}>
                {settings.chunkSize || 1} {settings.chunkSize === 1 ? 'word' : 'words'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([1, 3, 5] as const).map((count) => {
                const isSelected = (settings.chunkSize || 1) === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onUpdateSettings({ chunkSize: count })}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? `${highlight.bgBadge} border shadow-xs`
                        : `${theme.borderClass} ${theme.inputBg} ${theme.textMuted} hover:${theme.textPrimary}`
                    }`}
                    style={isSelected ? { borderColor: highlight.hex, color: highlight.hex } : undefined}
                  >
                    <span className="text-sm font-mono tabular-nums">{count}</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      {count === 1 ? 'Single' : count === 3 ? 'Triad' : 'Clause'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'paragraph-blur':
        return (
          <label
            key={id}
            htmlFor="toggle-paragraph-blur-settings"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>Paragraph Focus Blur</div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Blurs surrounding text in Flow mode and unblurs only the active or hovered paragraph
              </div>
            </div>
            <input
              id="toggle-paragraph-blur-settings"
              type="checkbox"
              checked={settings.focusParagraphBlur}
              onChange={(e) => onUpdateSettings({ focusParagraphBlur: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'optical-center':
        return (
          <label
            key={id}
            htmlFor="toggle-optical-center"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>Optical Center Lock (ORP)</div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Locks highlighted letters to a fixed horizontal center point
              </div>
            </div>
            <input
              id="toggle-optical-center"
              type="checkbox"
              checked={settings.opticalCenterLock}
              onChange={(e) => onUpdateSettings({ opticalCenterLock: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'fading-zoom':
        return (
          <label
            key={id}
            htmlFor="toggle-fading-zoom-entrance"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>Fading Zoom Entrance</div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Subtle scale and depth fade on incoming words to anchor gaze in the center
              </div>
            </div>
            <input
              id="toggle-fading-zoom-entrance"
              type="checkbox"
              checked={settings.fadingZoomEntrance !== false}
              onChange={(e) => onUpdateSettings({ fadingZoomEntrance: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'reticle-guides':
        return (
          <label
            key={id}
            htmlFor="toggle-reticle-guides"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>Center Focus Reticles</div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Top and bottom guide ticks pointing to the highlighted anchor
              </div>
            </div>
            <input
              id="toggle-reticle-guides"
              type="checkbox"
              checked={settings.showReticleGuides}
              onChange={(e) => onUpdateSettings({ showReticleGuides: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'vertical-rail':
        return (
          <label
            key={id}
            htmlFor="toggle-vertical-progress-rail"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                Vertical Right-Edge Progress Rail
              </div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Interactive vertical scrubber on the right screen edge for continuous spatial awareness
              </div>
            </div>
            <input
              id="toggle-vertical-progress-rail"
              type="checkbox"
              checked={settings.showVerticalProgressRail !== false}
              onChange={(e) => onUpdateSettings({ showVerticalProgressRail: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'drift-animation':
        return (
          <div
            key={id}
            className={`p-3.5 rounded-xl border transition-all ${
              settings.driftAnimation
                ? 'border-cyan-500/40 bg-cyan-500/5'
                : `${theme.borderClass} ${theme.accentSurface}`
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    settings.driftAnimation
                      ? 'bg-cyan-600 text-white'
                      : `${theme.inputBg} ${theme.textMuted}`
                  }`}
                >
                  <MoveHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                    Drift Animation
                  </div>
                  <div className={`text-[11px] ${theme.textMuted} mt-0.5`}>
                    Gently shifts the active word horizontally every few phrases to reduce visual fatigue and gaze lock.
                  </div>
                </div>
              </div>
              <input
                id="toggle-drift-animation"
                type="checkbox"
                checked={settings.driftAnimation}
                onChange={(e) => onUpdateSettings({ driftAnimation: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer mt-1 shrink-0"
              />
            </div>

            {settings.driftAnimation && (
              <div className={`mt-3 pt-3 border-t ${theme.borderClass} space-y-2`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={theme.textMuted}>Drift Amplitude</span>
                  <span className="font-mono tabular-nums text-cyan-500 font-semibold">
                    {DRIFT_INTENSITY_CONFIGS[settings.driftIntensity || 'moderate'].maxOffset}
                  </span>
                </div>

                <div className={`grid grid-cols-3 p-1 rounded-xl border ${theme.borderClass} ${theme.inputBg} gap-1`}>
                  {(['subtle', 'moderate', 'dynamic'] as const).map((level) => {
                    const isSelected = (settings.driftIntensity || 'moderate') === level;
                    const conf = DRIFT_INTENSITY_CONFIGS[level];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onUpdateSettings({ driftIntensity: level })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected ? 'text-white shadow-xs' : `${theme.textMuted} hover:${theme.textPrimary}`
                        }`}
                        style={isSelected ? { backgroundColor: highlight.hex } : undefined}
                      >
                        <span className="capitalize">{conf.label}</span>
                        <span className="text-[10px] opacity-80 font-mono tabular-nums">{conf.maxOffset}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={`text-[11px] ${theme.textMuted} text-center pt-0.5`}>
                  {DRIFT_INTENSITY_CONFIGS[settings.driftIntensity || 'moderate'].description}
                </p>
              </div>
            )}
          </div>
        );

      case 'heatmap-progress':
        return (
          <label
            key={id}
            htmlFor="toggle-heatmap-progress"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                Reading Complexity Heatmap
              </div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Color-gradient progress bar mapping dwell time and complex sections
              </div>
            </div>
            <input
              id="toggle-heatmap-progress"
              type="checkbox"
              checked={settings.showHeatmapProgress !== false}
              onChange={(e) => onUpdateSettings({ showHeatmapProgress: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'smart-auto-pause':
        return (
          <label
            key={id}
            htmlFor="toggle-smart-auto-pause"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>Smart Auto-Pause</div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Pauses RSVP automatically when the pointer leaves the window or the tab loses focus
              </div>
            </div>
            <input
              id="toggle-smart-auto-pause"
              type="checkbox"
              checked={settings.smartAutoPause !== false}
              onChange={(e) => onUpdateSettings({ smartAutoPause: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'smart-pace':
        return (
          <div
            key={id}
            className={`p-3.5 rounded-xl border transition-all ${
              settings.smartPace
                ? 'border-indigo-500/40 bg-indigo-500/5'
                : `${theme.borderClass} ${theme.accentSurface}`
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    settings.smartPace
                      ? 'bg-indigo-600 text-white'
                      : `${theme.inputBg} ${theme.textMuted}`
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                    Smart Pace · Adaptive Speed
                  </div>
                  <div className={`text-[11px] mt-0.5 ${theme.textMuted} leading-relaxed`}>
                    Detects word length and syllable complexity, slowing down for dense words and speeding up for short ones.
                  </div>
                </div>
              </div>
              <input
                id="toggle-smart-pace-setting"
                type="checkbox"
                checked={settings.smartPace}
                onChange={(e) => onUpdateSettings({ smartPace: e.target.checked })}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer mt-1 shrink-0"
              />
            </div>

            {settings.smartPace && (
              <div className={`mt-3 pt-2.5 border-t ${theme.borderClass} flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${theme.textMuted}`}>
                <span>
                  <strong className={theme.textPrimary}>Short words:</strong>{' '}
                  <span className="font-mono tabular-nums">15%–35% faster</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className={theme.textPrimary}>Complex words:</strong>{' '}
                  <span className="font-mono tabular-nums">20%–45% slower</span>
                </span>
              </div>
            )}
          </div>
        );

      case 'warmup-mode':
        return (
          <div
            key={id}
            className={`p-3.5 rounded-xl border transition-all ${
              settings.warmupMode
                ? 'border-amber-500/40 bg-amber-500/5'
                : `${theme.borderClass} ${theme.accentSurface}`
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    settings.warmupMode
                      ? 'bg-amber-600 text-white'
                      : `${theme.inputBg} ${theme.textMuted}`
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                    Warm-up Mode · First 300 Words
                  </div>
                  <div className={`text-[11px] mt-0.5 ${theme.textMuted} leading-relaxed`}>
                    Gradually ramps speed from your starting pace to target{' '}
                    <span className="font-mono tabular-nums">{settings.wpm}</span> WPM over the first 300 words.
                  </div>
                </div>
              </div>
              <input
                id="toggle-warmup-mode-setting"
                type="checkbox"
                checked={settings.warmupMode}
                onChange={(e) => onUpdateSettings({ warmupMode: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer mt-1 shrink-0"
              />
            </div>

            {settings.warmupMode && (
              <div className={`mt-3 pt-3 border-t ${theme.borderClass} space-y-3`}>
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-warmup-start-wpm" className={theme.textMuted}>
                    Warm-up Starting Speed
                  </label>
                  <span className="font-mono tabular-nums font-semibold text-amber-500">
                    {settings.warmupStartWpm || 180} WPM
                  </span>
                </div>

                <input
                  id="slider-warmup-start-wpm"
                  type="range"
                  min={80}
                  max={Math.max(100, Math.min(settings.wpm, 500))}
                  step={10}
                  value={Math.min(settings.warmupStartWpm || 180, settings.wpm)}
                  onChange={(e) => onUpdateSettings({ warmupStartWpm: parseInt(e.target.value, 10) })}
                  className={`w-full h-1.5 ${theme.sliderTrack} rounded-lg appearance-none cursor-pointer accent-amber-500`}
                />

                <div className={`flex items-center justify-between text-[11px] ${theme.textMuted}`}>
                  <span className="font-mono tabular-nums">Starts at {settings.warmupStartWpm || 180} WPM</span>
                  <span className="font-mono tabular-nums">Target {settings.wpm} WPM at word 300</span>
                </div>

                {warmupStatus && (
                  <div className={`flex items-center justify-between p-2.5 rounded-lg border ${theme.borderClass} ${theme.inputBg} text-[11px] gap-2 flex-wrap`}>
                    <div className={`flex items-center gap-2 flex-wrap ${theme.textMuted}`}>
                      <span>Session progress:</span>
                      <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                        {warmupStatus.sessionWordsRead} / {warmupStatus.totalWarmupWords} words
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-amber-500">
                        {warmupStatus.isWarmingUp
                          ? `Current: ${warmupStatus.currentWpm} WPM`
                          : 'Full speed active'}
                      </span>
                    </div>
                    {onResetWarmup && (
                      <button
                        type="button"
                        onClick={onResetWarmup}
                        className={`px-2.5 py-1 rounded-lg border ${theme.borderClass} ${theme.textPrimary} hover:border-amber-500/40 text-[11px] font-medium transition-colors whitespace-nowrap`}
                      >
                        Restart Ramp
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'punctuation-pauses':
        return (
          <label
            key={id}
            htmlFor="toggle-smart-pauses"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                Natural Punctuation Pauses
              </div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Briefly pauses at periods, commas, and paragraph breaks
              </div>
            </div>
            <input
              id="toggle-smart-pauses"
              type="checkbox"
              checked={settings.smartPunctuationPause}
              onChange={(e) => onUpdateSettings({ smartPunctuationPause: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'do-not-disturb':
        return (
          <label
            key={id}
            htmlFor="toggle-dnd-settings"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div className="flex items-center gap-2.5 pr-2">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  settings.doNotDisturb
                    ? 'bg-red-500/15 text-red-500'
                    : `${theme.inputBg} ${theme.textMuted}`
                }`}
              >
                {settings.doNotDisturb ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </div>
              <div>
                <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                  Do Not Disturb During Timer{settings.doNotDisturb ? ' · Active' : ''}
                </div>
                <div className={`text-[11px] ${theme.textMuted}`}>
                  Silences toast popups, alerts, and sound effects while the focus timer is running
                </div>
              </div>
            </div>
            <input
              id="toggle-dnd-settings"
              type="checkbox"
              checked={settings.doNotDisturb}
              onChange={(e) => onUpdateSettings({ doNotDisturb: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'focus-timer':
        if (!onOpenTimerModal) return null;
        return (
          <button
            key={id}
            id="drawer-open-timer-btn"
            type="button"
            onClick={() => {
              onClose();
              onOpenTimerModal();
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border ${theme.borderClass} ${theme.accentSurface} ${theme.textPrimary} hover:border-red-500/40 text-xs font-semibold transition-all`}
          >
            <Timer className="w-4 h-4 text-red-500" />
            <span>Open Reading Focus Timer & Sessions</span>
          </button>
        );

      case 'metronome':
        return (
          <label
            key={id}
            htmlFor="toggle-metronome-sound"
            className={`flex items-center justify-between gap-3 p-3.5 ${rowSurfaceClass} cursor-pointer`}
          >
            <div>
              <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                Rhythmic Focus Metronome
              </div>
              <div className={`text-[11px] ${theme.textMuted}`}>
                Subtle wooden tick on each beat to anchor reading rhythm
              </div>
            </div>
            <input
              id="toggle-metronome-sound"
              type="checkbox"
              checked={settings.metronomeSound}
              onChange={(e) => onUpdateSettings({ metronomeSound: e.target.checked })}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer shrink-0"
            />
          </label>
        );

      case 'voice-narration':
        return (
          <div key={id} className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${theme.textPrimary}`}>
                Audio Narration (Web Speech API)
              </span>
              <span
                className={`text-[11px] font-medium ${
                  isSpeechSupported ? 'text-emerald-500' : 'text-amber-500'
                }`}
              >
                {isSpeechSupported ? 'Browser speech ready' : 'Not supported in this browser'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border transition-all ${
                settings.speechNarration
                  ? 'border-red-500/40 bg-red-500/5'
                  : `${theme.borderClass} ${theme.accentSurface}`
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      settings.speechNarration
                        ? 'bg-red-500 text-white'
                        : `${theme.inputBg} ${theme.textMuted}`
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                      Voice-Over Narration
                    </div>
                    <div className={`text-[11px] ${theme.textMuted}`}>
                      Reads words aloud in sync with visual RSVP playback
                    </div>
                  </div>
                </div>

                <input
                  id="toggle-voice-narration"
                  type="checkbox"
                  disabled={!isSpeechSupported}
                  checked={settings.speechNarration}
                  onChange={(e) => onUpdateSettings({ speechNarration: e.target.checked })}
                  className="w-4 h-4 rounded accent-red-500 cursor-pointer disabled:opacity-40 shrink-0"
                />
              </div>

              {settings.speechNarration && (
                <div className={`mt-4 pt-3.5 border-t ${theme.borderClass} space-y-4`}>
                  {/* TTS Language Mode */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${theme.textMuted} flex items-center gap-1.5`}>
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        TTS Language Mode
                      </span>
                      <span className={`text-[11px] ${theme.textMuted}`}>
                        Auto-detected: {isFarsiContent ? 'Farsi' : 'English'}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 p-1 rounded-xl border ${theme.borderClass} ${theme.inputBg} gap-1`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTtsLang('english')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedTtsLang === 'english'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : `${theme.textMuted} hover:${theme.textPrimary}`
                        }`}
                      >
                        English TTS
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTtsLang('farsi')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedTtsLang === 'farsi'
                            ? 'bg-red-600 text-white shadow-xs'
                            : `${theme.textMuted} hover:${theme.textPrimary}`
                        }`}
                      >
                        Farsi TTS (فارسی)
                      </button>
                    </div>
                  </div>

                  {/* ENGLISH TTS SETTINGS */}
                  {selectedTtsLang === 'english' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="speech-voice-select-english"
                            className={`text-xs font-semibold ${theme.textPrimary}`}
                          >
                            English Voice Provider
                          </label>
                          <button
                            id="test-voice-preview-btn"
                            type="button"
                            onClick={handlePreviewVoice}
                            disabled={isPreviewPlaying}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{isPreviewPlaying ? 'Speaking...' : 'Test Voice'}</span>
                          </button>
                        </div>

                        {(() => {
                          const otherVoices = availableVoices.filter(
                            (v) =>
                              !v.isCustom &&
                              v.voiceURI !== 'custom-endpoint' &&
                              v.voiceURI !== 'farsi-custom' &&
                              v.voiceURI !== 'english-custom' &&
                              !v.isFarsi &&
                              !v.lang.startsWith('fa') &&
                              !v.voiceURI.startsWith('farsi-')
                          );

                          return (
                            <select
                              id="speech-voice-select-english"
                              value={settings.speechVoiceURI || ''}
                              onChange={(e) => onUpdateSettings({ speechVoiceURI: e.target.value })}
                              aria-label="Select English Voice"
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium ${theme.borderClass} ${theme.inputBg} ${theme.textPrimary} focus:outline-none focus:border-blue-500 transition-colors cursor-pointer`}
                            >
                              <option value="">Default System Voice (Auto-detect)</option>
                              <optgroup label="English Custom Endpoint (BYO Model)">
                                <option value="english-custom">
                                  English Custom Endpoint (/v1/audio/speech)
                                </option>
                              </optgroup>
                              {otherVoices.length > 0 && (
                                <optgroup label="English & System Voices">
                                  {otherVoices.map((v) => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                      {v.name} ({v.lang}) — {v.provider}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          );
                        })()}
                      </div>

                      {/* English Voice Pitch & Volume Sliders */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label htmlFor="speech-pitch-slider-en" className={`font-medium ${theme.textMuted}`}>
                              Pitch
                            </label>
                            <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                              {settings.speechPitch.toFixed(1)}x
                            </span>
                          </div>
                          <input
                            id="speech-pitch-slider-en"
                            type="range"
                            min="0.6"
                            max="1.4"
                            step="0.1"
                            value={settings.speechPitch}
                            onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-blue-500`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label htmlFor="speech-volume-slider-en" className={`font-medium ${theme.textMuted}`}>
                              Volume
                            </label>
                            <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                              {Math.round(settings.speechVolume * 100)}%
                            </span>
                          </div>
                          <input
                            id="speech-volume-slider-en"
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={settings.speechVolume}
                            onChange={(e) => onUpdateSettings({ speechVolume: parseFloat(e.target.value) })}
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-blue-500`}
                          />
                        </div>
                      </div>

                      {/* English Custom TTS Endpoint */}
                      <div className={`pt-3.5 border-t ${theme.borderClass} space-y-2.5`}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className={`font-semibold ${theme.textPrimary} flex items-center gap-1.5`}>
                            <Headphones className="w-3.5 h-3.5 text-blue-500" />
                            English Custom TTS Endpoint
                          </span>
                          <span className={`text-[11px] font-mono ${theme.textMuted}`}>OpenAI Compatible</span>
                        </div>
                        <p className={`text-[11px] ${theme.textMuted} leading-relaxed`}>
                          OpenAI-compatible speech endpoint (/v1/audio/speech) for English reading (e.g. OpenAI{' '}
                          <code className="font-mono">tts-1</code>, Kokoro <code className="font-mono">af_heart</code>,
                          LocalAI).
                        </p>
                        <div className="space-y-2">
                          <div>
                            <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                              Base URL / Endpoint
                            </label>
                            <input
                              type="text"
                              value={englishCustomConfig.baseUrl}
                              onChange={(e) =>
                                setEnglishCustomConfig((c) => ({ ...c, baseUrl: e.target.value }))
                              }
                              placeholder="https://api.openai.com/v1"
                              className={inputFieldClass}
                            />
                          </div>
                          <div>
                            <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                              API Key (optional for localhost)
                            </label>
                            <input
                              type="password"
                              value={englishCustomKeyInput}
                              onChange={(e) => setEnglishCustomKeyInput(e.target.value)}
                              placeholder="Bearer token or sk-..."
                              autoComplete="off"
                              className={inputFieldClass}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={`block text-[11px] ${theme.textMuted} mb-1`}>Model</label>
                              <input
                                type="text"
                                value={englishCustomConfig.model}
                                onChange={(e) =>
                                  setEnglishCustomConfig((c) => ({ ...c, model: e.target.value }))
                                }
                                placeholder="tts-1, kokoro"
                                className={inputFieldClass}
                              />
                            </div>
                            <div>
                              <label className={`block text-[11px] ${theme.textMuted} mb-1`}>Voice Name</label>
                              <input
                                type="text"
                                value={englishCustomConfig.voice}
                                onChange={(e) =>
                                  setEnglishCustomConfig((c) => ({ ...c, voice: e.target.value }))
                                }
                                placeholder="alloy, nova"
                                className={inputFieldClass}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEnglishCustomConfig}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save Endpoint</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleTestEnglishCustomEndpoint}
                              disabled={isEnglishCustomTesting}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isEnglishCustomTesting ? 'Testing...' : 'Test Endpoint'}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearEnglishCustomConfig}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${theme.textMuted} hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear</span>
                          </button>
                        </div>
                        {englishTtsNotice && (
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs">
                            {englishTtsNotice}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FARSI TTS SETTINGS */}
                  {selectedTtsLang === 'farsi' && (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          farsiOfflineTts.setEngine('piper');
                          onUpdateSettings({
                            fontFamily: 'vazirmatn',
                            speechVoiceURI: 'farsi-piper-neural',
                            farsiTtsEngine: 'piper',
                            speechNarration: true,
                            highlightStyle: 'middle-two',
                          });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-xs font-semibold text-red-500 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>بهینه‌سازی سریع برای فارسی (Apply Farsi Font & Voice)</span>
                      </button>

                      <div className={`pt-3 border-t ${theme.borderClass} space-y-3.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-red-500 shrink-0" />
                            <div>
                              <div className={`text-xs font-semibold ${theme.textPrimary}`}>
                                موتور گفتار آفلاین فارسی (Offline Farsi TTS)
                              </div>
                              <div className={`text-[11px] ${theme.textMuted}`}>
                                Offline WASM & ONNX Dual-Engine Pipeline
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Engine Selection Buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectFarsiEngine('espeak')}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              currentFarsiEngine === 'espeak'
                                ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30'
                                : `${theme.borderClass} ${theme.inputBg} hover:border-slate-500/40`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-xs font-semibold ${theme.textPrimary} flex items-center gap-1 truncate`}>
                                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span className="truncate">eSpeak NG</span>
                              </span>
                              {currentFarsiEngine === 'espeak' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              )}
                            </div>
                            <p className={`text-[10px] ${theme.textMuted} leading-tight`}>
                              سریع و سبک (&lt; 5MB)
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectFarsiEngine('piper')}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              currentFarsiEngine === 'piper'
                                ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30'
                                : `${theme.borderClass} ${theme.inputBg} hover:border-slate-500/40`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-xs font-semibold ${theme.textPrimary} flex items-center gap-1 truncate`}>
                                <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className="truncate">Piper ONNX</span>
                              </span>
                              {currentFarsiEngine === 'piper' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              )}
                            </div>
                            <p className={`text-[10px] ${theme.textMuted} leading-tight`}>
                              طبیعی (~25MB)
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectFarsiEngine('custom')}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              currentFarsiEngine === 'custom'
                                ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30'
                                : `${theme.borderClass} ${theme.inputBg} hover:border-slate-500/40`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-xs font-semibold ${theme.textPrimary} flex items-center gap-1 truncate`}>
                                <Headphones className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">Custom</span>
                              </span>
                              {currentFarsiEngine === 'custom' && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              )}
                            </div>
                            <p className={`text-[10px] ${theme.textMuted} leading-tight`}>
                              سرور اختصاصی
                            </p>
                          </button>
                        </div>

                        {/* Farsi Custom Endpoint Configuration */}
                        {currentFarsiEngine === 'custom' && (
                          <div className={`pt-3 border-t ${theme.borderClass} space-y-2.5`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-semibold ${theme.textPrimary} flex items-center gap-1.5`}>
                                <Headphones className="w-3.5 h-3.5 text-emerald-500" />
                                موتور گفتار سفارشی فارسی
                              </span>
                              <span className={`text-[11px] font-mono ${theme.textMuted}`}>OpenAI Compatible</span>
                            </div>
                            <p className={`text-[11px] ${theme.textMuted} leading-relaxed`}>
                              تنظیم سرور OpenAI-compatible برای مدل‌های گفتاری فارسی (مانند Kokoro Persian، Vahid، یا سرور محلی).
                            </p>
                            <div className="space-y-2">
                              <div>
                                <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                                  آدرس سرور (Base URL / Endpoint)
                                </label>
                                <input
                                  type="text"
                                  value={farsiCustomConfig.baseUrl}
                                  onChange={(e) =>
                                    setFarsiCustomConfig((c) => ({ ...c, baseUrl: e.target.value }))
                                  }
                                  placeholder="https://api.openai.com/v1"
                                  className={inputFieldClass}
                                />
                              </div>
                              <div>
                                <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                                  کلید API (اختیاری برای سرور محلی)
                                </label>
                                <input
                                  type="password"
                                  value={farsiCustomKeyInput}
                                  onChange={(e) => setFarsiCustomKeyInput(e.target.value)}
                                  placeholder="API key (Bearer token)"
                                  autoComplete="off"
                                  className={inputFieldClass}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                                    نام مدل (Model)
                                  </label>
                                  <input
                                    type="text"
                                    value={farsiCustomConfig.model}
                                    onChange={(e) =>
                                      setFarsiCustomConfig((c) => ({ ...c, model: e.target.value }))
                                    }
                                    placeholder="fa-tts یا tts-1"
                                    className={inputFieldClass}
                                  />
                                </div>
                                <div>
                                  <label className={`block text-[11px] ${theme.textMuted} mb-1`}>
                                    نام گوینده (Voice)
                                  </label>
                                  <input
                                    type="text"
                                    value={farsiCustomConfig.voice}
                                    onChange={(e) =>
                                      setFarsiCustomConfig((c) => ({ ...c, voice: e.target.value }))
                                    }
                                    placeholder="vahid یا alloy"
                                    className={inputFieldClass}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleSaveFarsiCustomConfig}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>ذخیره تنظیمات فارسی</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleTestFarsiCustomEndpoint}
                                  disabled={isFarsiCustomTesting}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>{isFarsiCustomTesting ? 'در حال تست...' : 'تست اتصال فارسی'}</span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleClearFarsiCustomConfig}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${theme.textMuted} hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap`}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>پاک‌کردن</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Piper Model Cache & Download Status */}
                        <div className={`pt-3 border-t ${theme.borderClass} space-y-2.5`}>
                          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                            <span className={`font-semibold ${theme.textPrimary} flex items-center gap-1.5`}>
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              وضعیت مدل هوش مصنوعی (Piper Model)
                            </span>

                            {piperCache.isOfflineReady ? (
                              <span className="text-[11px] font-medium text-emerald-500">
                                ذخیره در IndexedDB (آماده آفلاین)
                              </span>
                            ) : piperCache.status === 'downloading' ? (
                              <span className="flex items-center gap-1 text-[11px] font-mono tabular-nums font-medium text-amber-500">
                                <Activity className="w-3 h-3 animate-spin" />
                                دانلود: {piperCache.downloadProgress}%
                              </span>
                            ) : (
                              <span className={`text-[11px] ${theme.textMuted}`}>
                                دانلود نشده (فال‌بک فعال)
                              </span>
                            )}
                          </div>

                          {piperCache.status === 'downloading' && (
                            <div className={`w-full ${theme.sliderTrack} h-1.5 rounded-full overflow-hidden`}>
                              <div
                                className="bg-red-500 h-full transition-all duration-300"
                                style={{ width: `${piperCache.downloadProgress}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {!piperCache.isOfflineReady ? (
                              <button
                                type="button"
                                onClick={handleDownloadPiper}
                                disabled={piperCache.status === 'downloading'}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>
                                  {piperCache.status === 'downloading'
                                    ? 'در حال دانلود...'
                                    : 'دانلود و ذخیره آفلاین مدل (~25MB)'}
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleClearPiperCache}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${theme.borderClass} text-xs ${theme.textMuted} hover:text-red-500 transition-colors cursor-pointer`}
                                  title="حذف مدل از حافظه محلی برای آزادسازی فضا"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>پاک‌کردن کش</span>
                                </button>
                                <span className={`text-[11px] font-mono tabular-nums ${theme.textMuted}`}>
                                  {(piperCache.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleTestFarsiOfflineTts}
                              disabled={isFarsiPreviewPlaying}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isFarsiPreviewPlaying ? 'در حال پخش...' : 'تست گفتار فارسی'}</span>
                            </button>
                          </div>
                        </div>

                        {farsiTtsNotice && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs leading-relaxed flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{farsiTtsNotice}</span>
                          </div>
                        )}

                        {/* Farsi Speech Speed & Pitch Sliders */}
                        <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${theme.borderClass}`}>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${theme.textMuted}`}>سرعت گفتار فارسی</span>
                              <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                                {(settings.farsiTtsSpeed || 1.0).toFixed(1)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.6"
                              max="1.8"
                              step="0.1"
                              value={settings.farsiTtsSpeed || 1.0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUpdateSettings({ farsiTtsSpeed: val });
                              }}
                              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-red-500`}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${theme.textMuted}`}>زیروبمی (Pitch)</span>
                              <span className={`font-mono tabular-nums font-semibold ${theme.textPrimary}`}>
                                {(settings.farsiTtsPitch || 1.0).toFixed(1)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.7"
                              max="1.3"
                              step="0.1"
                              value={settings.farsiTtsPitch || 1.0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUpdateSettings({ farsiTtsPitch: val });
                              }}
                              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${theme.sliderTrack} accent-red-500`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RSVP Speed Synchronization Readout */}
                  <div className={`pt-3 border-t ${theme.borderClass} space-y-1`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${theme.textPrimary}`}>RSVP Synchronization</span>
                      <span className="font-mono tabular-nums font-semibold text-red-500">
                        {settings.wpm} WPM ({speechNarrator.computeSpeechRate(settings.wpm, settings.speechRateMultiplier)}x rate)
                      </span>
                    </div>
                    <p className={`text-[11px] ${theme.textMuted} leading-relaxed`}>
                      Speech synthesis speed automatically tracks your RSVP WPM, locking vocal word boundaries to the center visual highlight.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const activeTabItems = useMemo(
    () => searchResult.groupedMatches.find((g) => g.tab.id === activeTab)?.items || [],
    [searchResult.groupedMatches, activeTab]
  );

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          id="settings-drawer-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Settings Drawer Container */}
      <aside
        id="settings-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-labelledby="settings-drawer-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[520px] max-w-[95vw] flex flex-col ${theme.cardBgClass} border-l ${theme.borderClass} shadow-2xl transition-all duration-200 ease-out focus:outline-none ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Sticky Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.borderClass} shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="settings-drawer-title" className={`text-base font-bold ${theme.textPrimary}`}>Reading Settings</h3>
              <p className={`text-xs ${theme.textMuted}`}>
                Tune appearance, focus guides, pacing, and audio
              </p>
            </div>
          </div>

          <button
            id="close-settings-drawer-btn"
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className={`p-2 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticky Search Bar + 4 Top Category Tabs */}
        <div className={`px-6 pt-3.5 pb-3 border-b ${theme.borderClass} ${theme.cardBgClass} space-y-3 shrink-0`}>
          {/* Search Input */}
          <div className="relative">
            <Search
              className={`w-4 h-4 ${theme.textMuted} absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none`}
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              id="settings-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchQuery) {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                }
              }}
              placeholder="Search settings (font, ORP, warm-up, voice, Farsi)..."
              aria-label="Search settings across all categories"
              className={`w-full pl-9 pr-9 py-2 rounded-xl border ${theme.borderClass} ${theme.inputBg} ${theme.textPrimary} placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-colors`}
            />
            {searchQuery && (
              <button
                id="settings-search-clear-btn"
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear settings search"
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4-Tab Segmented Navigation */}
          <div
            role="tablist"
            aria-label="Settings categories"
            className={`grid grid-cols-4 p-1 rounded-xl border ${theme.borderClass} ${theme.accentSurface} gap-1 select-none`}
          >
            {SETTINGS_TABS.map((tab) => {
              const isSelected = !searchResult.isSearching && activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`settings-panel-${tab.id}`}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : `${theme.textMuted} hover:${theme.textPrimary}`
                  }`}
                  style={isSelected ? { backgroundColor: highlight.hex } : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body */}
        <div ref={bodyScrollRef} className="px-6 py-5 flex-1 overflow-y-auto">
          {searchResult.isSearching ? (
            <div className="space-y-5">
              {/* Quiet inline match count */}
              <div className={`flex items-center justify-between text-xs ${theme.textMuted}`}>
                <span className="tabular-nums">
                  {searchResult.totalMatches}{' '}
                  {searchResult.totalMatches === 1 ? 'setting matches' : 'settings match'} &ldquo;
                  {searchQuery.trim()}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-red-500 hover:underline font-medium cursor-pointer"
                >
                  Clear search
                </button>
              </div>

              {searchResult.totalMatches === 0 ? (
                <div
                  className={`py-10 px-4 text-center rounded-xl border ${theme.borderClass} ${theme.accentSurface} space-y-2.5`}
                >
                  <p className={`text-sm font-semibold ${theme.textPrimary}`}>
                    No settings found for &ldquo;{searchQuery.trim()}&rdquo;
                  </p>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Try keywords like theme, font, size, ORP, blur, warm-up, timer, metronome, or Farsi.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className={`mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border ${theme.borderClass} ${
                      isLightSurface ? 'bg-white text-slate-900' : theme.cardBgClass + ' ' + theme.textPrimary
                    } text-xs font-semibold hover:border-red-500/40 transition-colors cursor-pointer`}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {searchResult.groupedMatches.map((group) => (
                    <section key={group.tab.id} className="space-y-3">
                      <div className={`flex items-center justify-between pb-1.5 border-b ${theme.borderClass}`}>
                        <h4 className={`text-xs font-bold tracking-wide ${theme.textPrimary}`}>
                          {group.tab.label}
                        </h4>
                        <span className={`text-[11px] tabular-nums ${theme.textMuted}`}>
                          {group.items.length} {group.items.length === 1 ? 'match' : 'matches'}
                        </span>
                      </div>
                      <div className="space-y-3.5">
                        {group.items.map((item) => renderSettingItem(item.id))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              role="tabpanel"
              id={`settings-panel-${activeTab}`}
              aria-labelledby={`settings-tab-${activeTab}`}
              className="space-y-4"
            >
              <p className={`text-xs ${theme.textMuted}`}>{activeTabMeta.description}</p>
              <div className="space-y-4">
                {activeTabItems.map((item) => renderSettingItem(item.id))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Reset Defaults */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${theme.borderClass} ${theme.accentSurface} shrink-0`}>
          <button
            id="reset-settings-defaults-btn"
            type="button"
            onClick={onResetDefaults}
            className={`flex items-center gap-1.5 text-xs font-medium ${theme.textMuted} hover:${theme.textPrimary} transition-colors cursor-pointer`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-white font-semibold text-xs transition-transform active:scale-95 shadow-sm cursor-pointer"
            style={{ backgroundColor: highlight.hex }}
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
};
