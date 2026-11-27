export type SettingsTabId = 'appearance' | 'focus' | 'pacing' | 'audio';

export type SettingItemId =
  // Appearance
  | 'theme'
  | 'highlight-color'
  | 'highlight-pattern'
  | 'font-family'
  | 'rsvp-font-size'
  | 'flow-font-size'
  | 'letter-spacing'
  // Focus
  | 'rsvp-chunks'
  | 'paragraph-blur'
  | 'optical-center'
  | 'fading-zoom'
  | 'reticle-guides'
  | 'vertical-rail'
  | 'drift-animation'
  | 'heatmap-progress'
  // Pacing
  | 'smart-auto-pause'
  | 'smart-pace'
  | 'warmup-mode'
  | 'punctuation-pauses'
  | 'do-not-disturb'
  | 'focus-timer'
  // Audio
  | 'metronome'
  | 'voice-narration';

export interface SettingsTabMeta {
  id: SettingsTabId;
  label: string;
  description: string;
}

export interface SettingsCatalogItem {
  id: SettingItemId;
  tab: SettingsTabId;
  title: string;
  description: string;
  keywords: string[];
}

export const SETTINGS_TABS: readonly SettingsTabMeta[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Themes, highlight colors, fonts, and text sizing',
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'RSVP display, optical guides, and visual comfort',
  },
  {
    id: 'pacing',
    label: 'Pacing',
    description: 'Adaptive speed, auto-pause, warm-up, and sessions',
  },
  {
    id: 'audio',
    label: 'Audio',
    description: 'Metronome rhythm and voice-over narration',
  },
] as const;

export const SETTINGS_CATALOG: readonly SettingsCatalogItem[] = [
  // Appearance
  {
    id: 'theme',
    tab: 'appearance',
    title: 'Color Mode & Theme',
    description: 'Switch between dark mode, light mode, midnight, OLED black, warm sepia, and Nordic slate.',
    keywords: ['dark', 'light', 'midnight', 'oled', 'sepia', 'nordic', 'palette', 'background', 'contrast'],
  },
  {
    id: 'highlight-color',
    tab: 'appearance',
    title: 'Highlight Color',
    description: 'Choose the accent color for the highlighted focus anchor letters.',
    keywords: ['red', 'crimson', 'amber', 'gold', 'emerald', 'green', 'blue', 'purple', 'violet', 'cyan', 'accent', 'orp'],
  },
  {
    id: 'highlight-pattern',
    tab: 'appearance',
    title: 'Highlight Pattern',
    description: 'Choose two middle letters, single middle letter, or bionic prefix guide.',
    keywords: ['middle', 'bionic', 'prefix', 'algorithm', 'letters', 'center', 'orp', 'anchor'],
  },
  {
    id: 'font-family',
    tab: 'appearance',
    title: 'Reading Font Family',
    description: 'Choose Lexend, Atkinson Hyperlegible, JetBrains Mono, Newsreader Serif, Plus Jakarta Sans, or Vazirmatn.',
    keywords: ['font', 'typeface', 'dyslexia', 'adhd', 'lexend', 'atkinson', 'jetbrains', 'mono', 'serif', 'newsreader', 'jakarta', 'vazirmatn', 'farsi', 'persian', 'فارسی'],
  },
  {
    id: 'rsvp-font-size',
    tab: 'appearance',
    title: 'RSVP Word Size',
    description: 'Adjust the word size in Word-by-Word RSVP mode.',
    keywords: ['font', 'text', 'scale', 'zoom', 'px', 'larger', 'smaller'],
  },
  {
    id: 'flow-font-size',
    tab: 'appearance',
    title: 'Full Text Flow Word Size',
    description: 'Adjust paragraph text size in Full Text Flow reading mode.',
    keywords: ['font', 'text', 'scale', 'zoom', 'px', 'paragraph', 'larger', 'smaller'],
  },
  {
    id: 'letter-spacing',
    tab: 'appearance',
    title: 'Letter Spacing Preset',
    description: 'Select compact, comfortable, or generous character tracking.',
    keywords: ['tracking', 'kerning', 'compact', 'comfortable', 'generous', 'dyslexia', 'spacing'],
  },

  // Focus
  {
    id: 'rsvp-chunks',
    tab: 'focus',
    title: 'RSVP Words Per Flash',
    description: 'Display 1 single word, 3 triad words, or 5 clause words at a time.',
    keywords: ['chunk', 'chunks', 'single', 'triad', 'clause', 'words', 'flash', 'group'],
  },
  {
    id: 'paragraph-blur',
    tab: 'focus',
    title: 'Paragraph Focus Blur',
    description: 'Blurs surrounding text in Full Text Flow and unblurs only the active or hovered paragraph.',
    keywords: ['blur', 'flow', 'dim', 'distraction', 'highlight', 'paragraph'],
  },
  {
    id: 'optical-center',
    tab: 'focus',
    title: 'Optical Center Lock (ORP)',
    description: 'Locks highlighted anchor letters to a fixed horizontal center point.',
    keywords: ['orp', 'alignment', 'center', 'fixation', 'eye', 'saccade'],
  },
  {
    id: 'fading-zoom',
    tab: 'focus',
    title: 'Fading Zoom Entrance',
    description: 'Applies subtle scale and depth fade to incoming RSVP words.',
    keywords: ['animation', 'motion', 'scale', 'fade', 'entrance', 'zoom', 'gaze'],
  },
  {
    id: 'reticle-guides',
    tab: 'focus',
    title: 'Center Focus Reticles',
    description: 'Shows top and bottom guide ticks pointing to the highlighted anchor.',
    keywords: ['reticle', 'crosshair', 'ticks', 'guides', 'lines', 'center'],
  },
  {
    id: 'vertical-rail',
    tab: 'focus',
    title: 'Vertical Right-Edge Progress Rail',
    description: 'Interactive vertical timeline on the right edge for scrubbing and spatial awareness.',
    keywords: ['scrubber', 'scrollbar', 'timeline', 'progress', 'rail', 'edge', 'navigation'],
  },
  {
    id: 'drift-animation',
    tab: 'focus',
    title: 'Drift Animation',
    description: 'Gently shifts the active word horizontally to reduce visual fatigue and gaze lock.',
    keywords: ['amplitude', 'subtle', 'moderate', 'dynamic', 'anti-fatigue', 'saccadic', 'shift', 'eye strain'],
  },
  {
    id: 'heatmap-progress',
    tab: 'focus',
    title: 'Reading Complexity Heatmap',
    description: 'Shows a color-gradient progress bar mapping dwell time and dense sections.',
    keywords: ['heatmap', 'dwell', 'complexity', 'progress', 'bar', 'analytics'],
  },

  // Pacing
  {
    id: 'smart-auto-pause',
    tab: 'pacing',
    title: 'Smart Auto-Pause',
    description: 'Automatically pauses RSVP playback when the pointer leaves the window or the tab loses focus.',
    keywords: ['pause', 'tab', 'mouse', 'leave', 'window', 'blur', 'shield', 'distraction'],
  },
  {
    id: 'smart-pace',
    tab: 'pacing',
    title: 'Smart Pace',
    description: 'Adapts playback speed automatically based on word length and syllable complexity.',
    keywords: ['adaptive', 'speed', 'wpm', 'syllable', 'complex', 'short', 'long', 'tempo'],
  },
  {
    id: 'warmup-mode',
    tab: 'pacing',
    title: 'Warm-up Mode',
    description: 'Gradually ramps speed from a starting WPM to target WPM over the first 300 words.',
    keywords: ['ramp', 'starting speed', 'wpm', 'gradual', 'settle', '300 words', 'restart ramp'],
  },
  {
    id: 'punctuation-pauses',
    tab: 'pacing',
    title: 'Natural Punctuation Pauses',
    description: 'Adds brief natural pauses at periods, commas, and paragraph breaks.',
    keywords: ['comma', 'period', 'sentence', 'paragraph', 'pause', 'rhythm', 'cadence'],
  },
  {
    id: 'do-not-disturb',
    tab: 'pacing',
    title: 'Do Not Disturb During Timer',
    description: 'Silences toast notifications, alerts, and sound effects while the focus timer runs.',
    keywords: ['dnd', 'mute', 'silence', 'notifications', 'toast', 'alerts', 'timer', 'sessions'],
  },
  {
    id: 'focus-timer',
    tab: 'pacing',
    title: 'Reading Focus Timer & Sessions',
    description: 'Configure timed focus reading blocks and session goals.',
    keywords: ['pomodoro', 'countdown', 'clock', 'session', 'block', 'timer'],
  },

  // Audio
  {
    id: 'metronome',
    tab: 'audio',
    title: 'Rhythmic Focus Metronome',
    description: 'Plays a subtle wooden tick on each beat to anchor reading rhythm.',
    keywords: ['tick', 'click', 'beat', 'sound', 'rhythm', 'audio'],
  },
  {
    id: 'voice-narration',
    tab: 'audio',
    title: 'Voice-Over Narration (TTS)',
    description: 'Reads words aloud in sync with RSVP playback using system voices, offline Farsi Piper/eSpeak engines, or custom OpenAI-compatible endpoints.',
    keywords: [
      'tts',
      'speech',
      'voice',
      'narrator',
      'speak',
      'read aloud',
      'pitch',
      'volume',
      'rate',
      'english',
      'farsi',
      'persian',
      'piper',
      'espeak',
      'onnx',
      'wasm',
      'offline',
      'model',
      'cache',
      'custom endpoint',
      'openai',
      'api',
      'kokoro',
      'فارسی',
      'گفتار',
      'صوتی',
    ],
  },
] as const;

export interface GroupedSettingsSearchResult {
  tab: SettingsTabMeta;
  items: SettingsCatalogItem[];
}

export interface SettingsSearchResult {
  isSearching: boolean;
  normalizedQuery: string;
  matchedIds: Set<SettingItemId>;
  totalMatches: number;
  groupedMatches: GroupedSettingsSearchResult[];
}

/**
 * Multi-token, case-insensitive search across all settings categories.
 * Every whitespace-separated token must match the setting's title, description,
 * category label, or keywords.
 */
export function filterSettingsCatalog(query: string): SettingsSearchResult {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      isSearching: false,
      normalizedQuery: '',
      matchedIds: new Set(SETTINGS_CATALOG.map((item) => item.id)),
      totalMatches: SETTINGS_CATALOG.length,
      groupedMatches: SETTINGS_TABS.map((tab) => ({
        tab,
        items: SETTINGS_CATALOG.filter((item) => item.tab === tab.id),
      })),
    };
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tabLabelById = new Map(SETTINGS_TABS.map((t) => [t.id, t.label.toLowerCase()]));

  const matchedItems = SETTINGS_CATALOG.filter((item) => {
    const haystack = [
      item.title,
      item.description,
      tabLabelById.get(item.tab) || '',
      ...item.keywords,
    ]
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });

  const matchedIds = new Set(matchedItems.map((item) => item.id));
  const groupedMatches: GroupedSettingsSearchResult[] = SETTINGS_TABS.map((tab) => ({
    tab,
    items: matchedItems.filter((item) => item.tab === tab.id),
  })).filter((group) => group.items.length > 0);

  return {
    isSearching: true,
    normalizedQuery,
    matchedIds,
    totalMatches: matchedItems.length,
    groupedMatches,
  };
}
