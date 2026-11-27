/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ReaderSettings, 
  ReaderViewMode, 
  SavedDocument, 
  HighlightedWordParts,
  ReaderDocument,
  InputSourceType,
  DocumentMetadata,
  DocumentStructure,
  DocumentNavigationState,
  ResolvedDocumentPosition
} from './types';
import { SAMPLE_TEXTS } from './data/sampleTexts';
import { parseTextIntoWords, countWordsFast, isRtlText } from './utils/textParser';
import { logDevDiagnostic } from './utils/performanceDiagnostics';
import { 
  THEME_CONFIGS, 
  HIGHLIGHT_COLORS, 
  FONT_CONFIGS, 
  getTheme,
  resolveLetterSpacingPreset,
  resolveLetterSpacingEm
} from './utils/themeStyles';
import { Header } from './components/Header';
import { RSVPReader } from './components/RSVPReader';
import { FlowReader } from './components/FlowReader';
import { DocumentSidebar } from './components/DocumentSidebar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ExtensionHubModal } from './components/ExtensionHubModal';
import { FocusTimerModal } from './components/FocusTimerModal';
import { FocusMilestoneModal } from './components/FocusMilestoneModal';
import { ReadingStatsModal } from './components/ReadingStatsModal';
import { triggerFocusBlockConfetti } from './utils/confettiCelebration';
import { 
  getFocusMilestonesData, 
  recordFocusBlockCompleted, 
  FocusMilestonesData, 
  FocusMilestone, 
  FocusCompletedSession 
} from './services/focus/focusMilestoneService';
import { classifyDocumentSize } from './services/structure/documentSizeClassifier';
import { safeStorage } from './utils/safeStorage';
import { 
  isChromeExtensionEnvironment, 
  getStoredCapturedText, 
  clearStoredCapturedText 
} from './utils/extensionBridge';
import { useReadingHeatmap } from './hooks/useReadingHeatmap';
import { useSmartAutoPause, AutoPauseReason } from './hooks/useSmartAutoPause';
import { useControlsIdle } from './hooks/useControlsIdle';
import { useReaderWindow } from './hooks/useReaderWindow';
import { calculateWarmupStatus, WARMUP_TOTAL_WORDS } from './utils/smartPacing';
import { documentStorageService } from './services/document/documentStorageService';
import { createDocumentHandle } from './services/document/documentHandle';
import { workerProcessingService } from './services/worker/workerProcessingService';
import {
  migrateLocalStorageToIndexedDB,
  ensureSampleDocumentInStorage,
  DOCUMENT_STORAGE_KEYS,
} from './services/document/migration';
import {
  buildHistoryExcerpt,
  createUniqueDocumentId,
  upsertHistoryDocument,
} from './services/document/readingHistory';
import { hasDragDataFromOutside, extractLinkFromDataTransfer } from './services/import/detectInput';
import { extractClipboardContent } from './services/import/extractText';
import {
  resolveKeyboardShortcut,
  extractShortcutKeyEvent,
  shouldHandleGlobalPaste,
} from './utils/keyboardShortcuts';
import { CheckCircle2, Zap, Upload, Undo2 } from 'lucide-react';

const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 320,
  chunkSize: 1,
  highlightColor: 'red',
  highlightStyle: 'middle-two',
  theme: 'midnight',
  fontFamily: 'lexend',
  fontSize: 54,
  flowFontSize: 22,
  lineHeight: 1.8,
  letterSpacing: 0.02,
  letterSpacingPreset: 'comfortable',
  focusParagraphBlur: false,
  smartPunctuationPause: true,
  metronomeSound: false,
  metronomeVolume: 0.3,
  showReticleGuides: true,
  showContextWords: false,
  opticalCenterLock: true,
  speechNarration: false,
  speechVoiceURI: '',
  speechPitch: 1.0,
  speechVolume: 1.0,
  speechRateMultiplier: 1.0,
  farsiTtsEngine: 'piper',
  farsiTtsSpeed: 1.0,
  farsiTtsPitch: 1.0,
  doNotDisturb: false,
  showHeatmapProgress: true,
  smartAutoPause: true,
  smartPace: true,
  warmupMode: false,
  warmupStartWpm: 180,
  driftAnimation: false,
  driftIntensity: 'moderate',
  fadingZoomEntrance: true,
};

const STORAGE_KEYS = {
  SETTINGS: DOCUMENT_STORAGE_KEYS.SETTINGS,
  VIEW_MODE: DOCUMENT_STORAGE_KEYS.VIEW_MODE,
  CURRENT_TEXT: DOCUMENT_STORAGE_KEYS.CURRENT_TEXT,
  CURRENT_TITLE: DOCUMENT_STORAGE_KEYS.CURRENT_TITLE,
  SAVED_DOCS: DOCUMENT_STORAGE_KEYS.SAVED_DOCS,
  CURRENT_INDEX: DOCUMENT_STORAGE_KEYS.CURRENT_INDEX,
  ACTIVE_DOC_ID: DOCUMENT_STORAGE_KEYS.ACTIVE_DOC_ID,
  MIGRATION_V2_DONE: DOCUMENT_STORAGE_KEYS.MIGRATION_V2_DONE,
};

export default function App() {
  // 1. Settings state with safeStorage recovery and strict sanitization (persisting chunkSize, fontSize, flowFontSize, etc.)
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          if (!THEME_CONFIGS[merged.theme as keyof typeof THEME_CONFIGS]) merged.theme = DEFAULT_SETTINGS.theme;
          if (!HIGHLIGHT_COLORS[merged.highlightColor as keyof typeof HIGHLIGHT_COLORS]) merged.highlightColor = DEFAULT_SETTINGS.highlightColor;
          if (!FONT_CONFIGS[merged.fontFamily as keyof typeof FONT_CONFIGS]) merged.fontFamily = DEFAULT_SETTINGS.fontFamily;
          if (typeof merged.wpm !== 'number' || isNaN(merged.wpm) || merged.wpm < 50) merged.wpm = DEFAULT_SETTINGS.wpm;
          if (typeof merged.fontSize !== 'number' || isNaN(merged.fontSize) || merged.fontSize < 16) merged.fontSize = DEFAULT_SETTINGS.fontSize;
          if (typeof merged.flowFontSize !== 'number' || isNaN(merged.flowFontSize) || merged.flowFontSize < 12) merged.flowFontSize = DEFAULT_SETTINGS.flowFontSize;
          if (![1, 3, 5].includes(Number(merged.chunkSize))) {
            merged.chunkSize = 1;
          } else {
            merged.chunkSize = Number(merged.chunkSize) as 1 | 3 | 5;
          }
          if (typeof merged.doNotDisturb !== 'boolean') merged.doNotDisturb = false;
          if (typeof merged.showHeatmapProgress !== 'boolean') merged.showHeatmapProgress = true;
          if (typeof merged.smartAutoPause !== 'boolean') merged.smartAutoPause = true;
          if (typeof merged.smartPace !== 'boolean') merged.smartPace = true;
          if (typeof merged.warmupMode !== 'boolean') merged.warmupMode = false;
          if (typeof merged.warmupStartWpm !== 'number' || isNaN(merged.warmupStartWpm) || merged.warmupStartWpm < 50) {
            merged.warmupStartWpm = 180;
          }
          if (typeof merged.driftAnimation !== 'boolean') merged.driftAnimation = false;
          if (!['subtle', 'moderate', 'dynamic'].includes(merged.driftIntensity as string)) {
            merged.driftIntensity = 'moderate';
          }
          if (typeof merged.fadingZoomEntrance !== 'boolean') merged.fadingZoomEntrance = true;
          merged.letterSpacingPreset = resolveLetterSpacingPreset(merged);
          merged.letterSpacing = resolveLetterSpacingEm(merged);
          return merged;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  });

  // 2. Document & Windowed Reader state
  const [currentTitle, setCurrentTitle] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.CURRENT_TITLE);
      if (saved && typeof saved === 'string' && saved.trim()) return saved;
    } catch {
      // Ignore
    }
    return SAMPLE_TEXTS[0].title;
  });

  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.SAVED_DOCS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return SAMPLE_TEXTS;
  });

  const [activeDocId, setActiveDocId] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.ACTIVE_DOC_ID);
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return SAMPLE_TEXTS[0].id;
  });
  const activeDocIdRef = useRef<string>(activeDocId);
  activeDocIdRef.current = activeDocId;

  // Incremented after storage initialization or document persistence so handles & hooks re-hydrate cleanly
  const [documentRevision, setDocumentRevision] = useState(0);

  // Phase 2 ReaderDocumentHandle abstraction
  const activeDocumentHandle = useMemo(() => {
    return createDocumentHandle(activeDocId);
  }, [activeDocId, documentRevision]);

  // Phase 2: Run backward-compatible IndexedDB migration and load active document metadata
  useEffect(() => {
    let isMounted = true;

    async function initStorageLayer() {
      try {
        const migrationResult = await migrateLocalStorageToIndexedDB();

        // Determine the active document ID and ensure built-in samples exist in IndexedDB
        const storedActiveId = safeStorage.getItem(STORAGE_KEYS.ACTIVE_DOC_ID);
        const targetId = storedActiveId || migrationResult.activeDocId || activeDocIdRef.current;
        if (targetId) {
          await ensureSampleDocumentInStorage(targetId);
        }

        // Refresh document list from IndexedDB metadata
        const dbDocs = await documentStorageService.listDocuments();
        if (isMounted && dbDocs.length > 0) {
          setSavedDocs((prev) => {
            const excerptById = new Map(prev.map((doc) => [doc.id, doc.excerpt]));
            return dbDocs.map((meta) => ({
              id: meta.id,
              title: meta.title,
              wordCount: meta.totalWords,
              lastReadIndex: meta.lastReadWordIndex,
              lastReadDate: new Date(meta.updatedAt).toISOString(),
              category: meta.category,
              sourceType: meta.sourceType,
              sourceUrl: meta.sourceUrl,
              fileName: meta.fileName,
              direction: meta.direction,
              totalCharacters: meta.totalCharacters,
              pageCount: meta.pageCount,
              hasStructure: meta.hasStructure,
              excerpt: excerptById.get(meta.id),
            }));
          });
        }

        // Load active document metadata & structure immediately after migration/seeding
        if (targetId) {
          const [meta, struct] = await Promise.all([
            documentStorageService.getMetadata(targetId),
            documentStorageService.getStructure(targetId).catch(() => null),
          ]);
          if (isMounted) {
            if (targetId !== activeDocIdRef.current && migrationResult.activeDocId === targetId) {
              setActiveDocId(targetId);
            }
            if (meta && (targetId === activeDocIdRef.current || migrationResult.activeDocId === targetId)) {
              setActiveMetadata(meta);
              setActiveStructure(struct);
              if (meta.title) setCurrentTitle(meta.title);
              if (meta.lastReadWordIndex !== undefined && meta.lastReadWordIndex > 0) {
                setCurrentIndex(meta.lastReadWordIndex);
              }
            }
          }
        }

        if (isMounted) {
          setDocumentRevision((rev) => rev + 1);
        }
      } catch (err) {
        console.warn('Phase 2 storage layer initialization error:', err);
      }
    }

    initStorageLayer();

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Playback & navigation state
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.CURRENT_INDEX);
      if (saved) {
        const parsedIdx = parseInt(saved, 10);
        if (!isNaN(parsedIdx) && isFinite(parsedIdx)) {
          return Math.max(0, parsedIdx);
        }
      }
    } catch {
      // Ignore
    }
    return 0;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<ReaderViewMode>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      if (saved === 'rsvp' || saved === 'flow') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'rsvp';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Synchronize viewMode to localStorage so reader remembers user preference on refresh
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
    } catch {
      // Ignore
    }
  }, [viewMode]);

  // Synchronize settings (chunk size, font size, etc.) to localStorage on change
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // 4. Modals and drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'overview' | 'input'>('overview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExtensionHubOpen, setIsExtensionHubOpen] = useState(false);
  const [extensionHubInitialTab, setExtensionHubInitialTab] = useState<'shortcuts' | 'simulator' | 'install' | 'files'>('shortcuts');
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = useRef(0);

  // Phase 6: Active document metadata, structure, and navigation state (PART K)
  const [activeMetadata, setActiveMetadata] = useState<DocumentMetadata | null>(null);
  const [activeStructure, setActiveStructure] = useState<DocumentStructure | null>(null);
  const [navigationState, setNavigationState] = useState<DocumentNavigationState>(() => ({
    documentId: activeDocId,
    position: { kind: 'word', wordIndex: currentIndex },
    viewMode,
  }));

  // Sync navigation state when activeDocId, currentIndex, or viewMode changes
  useEffect(() => {
    setNavigationState((prev) => ({
      ...prev,
      documentId: activeDocId,
      position: { kind: 'word', wordIndex: currentIndex },
      viewMode,
    }));
  }, [activeDocId, currentIndex, viewMode]);

  // Load document metadata and structural index whenever activeDocumentHandle updates
  useEffect(() => {
    let isMounted = true;
    async function syncMetaAndStructure() {
      try {
        const [meta, struct] = await Promise.all([
          activeDocumentHandle.getMetadata().catch(() => null),
          activeDocumentHandle.getStructure().catch(() => null),
        ]);
        if (!isMounted) return;
        if (meta) {
          setActiveMetadata(meta);
          setActiveStructure(struct);
        } else {
          setActiveMetadata((prev) => (prev && prev.id === activeDocumentHandle.id ? prev : null));
          setActiveStructure((prev) =>
            prev && prev.documentId === activeDocumentHandle.id ? prev : null
          );
        }
      } catch (err) {
        console.warn('Error loading active doc meta/structure:', err);
      }
    }
    syncMetaAndStructure();
    return () => {
      isMounted = false;
    };
  }, [activeDocumentHandle]);

  // Smart Auto-Pause state
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [autoPauseReason, setAutoPauseReason] = useState<AutoPauseReason | null>(null);

  // 5. Reading Focus Timer & Sessions (Requirement 4 & 5)
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number>(0);
  const [initialTimerDuration, setInitialTimerDuration] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerSet, setIsTimerSet] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasTimerRunningBeforeAutoPauseRef = useRef(false);

  // Focus Milestones & Celebration State
  const [milestonesData, setMilestonesData] = useState<FocusMilestonesData>(() => getFocusMilestonesData());
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [newlyUnlockedMilestones, setNewlyUnlockedMilestones] = useState<FocusMilestone[]>([]);
  const [lastCelebratedSession, setLastCelebratedSession] = useState<FocusCompletedSession | undefined>(undefined);
  const focusBlockStartWordIndexRef = useRef<number>(0);
  const focusBlockPresetLabelRef = useRef<string>('');

  // Timer countdown effect - halts while auto-paused
  useEffect(() => {
    if (isTimerRunning && timerSecondsRemaining > 0 && !isAutoPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as NodeJS.Timeout);
            setIsTimerRunning(false);
            setIsTimerSet(false);
            // Auto pause playback when session finishes
            setIsPlaying(false);

            const completedDurationMins = Math.max(1, Math.round(initialTimerDuration / 60));
            const wordsReadInBlock = Math.max(0, currentIndex - focusBlockStartWordIndexRef.current);
            const avgWpm = wordsReadInBlock > 0 && completedDurationMins > 0
              ? Math.round(wordsReadInBlock / completedDurationMins)
              : settings.wpm;

            // Trigger celebratory multi-stage confetti animation!
            const currentHighlightHex = HIGHLIGHT_COLORS[settings.highlightColor]?.hex || '#ef4444';
            triggerFocusBlockConfetti(currentHighlightHex);

            // Record completed focus session and evaluate newly unlocked milestones
            const { data, newlyUnlocked } = recordFocusBlockCompleted({
              durationMinutes: completedDurationMins,
              presetLabel: focusBlockPresetLabelRef.current || `${completedDurationMins}m Focus Block`,
              wordsRead: wordsReadInBlock,
              avgWpm,
            });

            setMilestonesData(data);
            setNewlyUnlockedMilestones(newlyUnlocked);
            setLastCelebratedSession(data.lastCompletedSession);
            setIsMilestoneModalOpen(true);

            // Notify user unless Do Not Disturb is enabled
            if (!settings.doNotDisturb) {
              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
              }
              const toastId = ++toastIdRef.current;
              setToastNotification({
                id: toastId,
                message:
                  newlyUnlocked.length > 0
                    ? `🎉 Focus block complete! Unlocked "${newlyUnlocked[0].title}" milestone!`
                    : '🎉 Focus reading block complete! Great job staying focused.',
              });
              toastTimeoutRef.current = setTimeout(() => {
                setToastNotification((curr) => (curr?.id === toastId ? null : curr));
                toastTimeoutRef.current = null;
              }, 5000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timerSecondsRemaining, isAutoPaused, initialTimerDuration, currentIndex, settings.highlightColor, settings.wpm, settings.doNotDisturb]);

  // Show Toast with Do Not Disturb enforcement (bypassable for destructive-action Undo prompts)
  const showToast = useCallback((
    msg: string,
    options?: {
      actionLabel?: string;
      onAction?: () => void;
      durationMs?: number;
      bypassDnd?: boolean;
    }
  ) => {
    // When timer is set and Do Not Disturb is ON, suppress informational notifications
    if (!options?.bypassDnd && isTimerSet && settings.doNotDisturb) {
      return;
    }
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    const id = ++toastIdRef.current;
    setToastNotification({
      id,
      message: msg,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    });
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification((curr) => (curr?.id === id ? null : curr));
      toastTimeoutRef.current = null;
    }, options?.durationMs ?? 4000);
  }, [isTimerSet, settings.doNotDisturb]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Warm-up Mode Session Tracking (Gradually increases speed over first 300 words)
  const [sessionWordsRead, setSessionWordsRead] = useState(0);
  const sessionWordsReadRef = useRef(sessionWordsRead);
  sessionWordsReadRef.current = sessionWordsRead;

  // Undo snapshot for accidental/unwanted document restarts
  const restartUndoRef = useRef<{
    documentId: string;
    previousIndex: number;
    previousSessionWordsRead: number;
  } | null>(null);
  const [canUndoRestart, setCanUndoRestart] = useState(false);

  // Clear restart undo snapshot when switching to a different document
  useEffect(() => {
    if (restartUndoRef.current && restartUndoRef.current.documentId !== activeDocId) {
      restartUndoRef.current = null;
      setCanUndoRestart(false);
    }
  }, [activeDocId]);

  const warmupStatus = useMemo(() => {
    return calculateWarmupStatus(
      settings.wpm,
      settings.warmupMode,
      settings.warmupStartWpm || 180,
      sessionWordsRead
    );
  }, [sessionWordsRead, settings.warmupStartWpm, settings.wpm, settings.warmupMode]);

  const handleWordStep = useCallback(() => {
    setSessionWordsRead((prev) => prev + 1);
  }, []);

  const handleSkipWarmup = useCallback(() => {
    setSessionWordsRead(WARMUP_TOTAL_WORDS);
  }, []);

  const handleResetWarmup = useCallback(() => {
    setSessionWordsRead(0);
  }, []);

  // 6. Window-level Drag & Drop for Universal Input Hub
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [pendingDroppedFile, setPendingDroppedFile] = useState<File | null>(null);
  const [pendingDroppedUrl, setPendingDroppedUrl] = useState<string | null>(null);
  const [pendingDroppedText, setPendingDroppedText] = useState<string | null>(null);
  const dragWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  const clearWindowDrag = useCallback(() => {
    if (dragWatchdogRef.current) {
      clearTimeout(dragWatchdogRef.current);
      dragWatchdogRef.current = null;
    }
    setIsWindowDragging(false);
  }, []);

  useEffect(() => {
    const scheduleWatchdog = () => {
      if (dragWatchdogRef.current) {
        clearTimeout(dragWatchdogRef.current);
      }
      // Browser fires dragover every ~50ms while a file or link is actively held over the window;
      // if no dragover occurs within 250ms, the drag has ended or left the window/iframe.
      dragWatchdogRef.current = setTimeout(() => {
        setIsWindowDragging(false);
      }, 250);
    };

    const handleDragEnter = (e: DragEvent) => {
      if (!hasDragDataFromOutside(e.dataTransfer)) return;
      e.preventDefault();
      setIsWindowDragging(true);
      // Automatically open the Universal Input Hub when dragging a file or link from outside
      setSidebarActiveTab('input');
      setIsSidebarOpen(true);
      scheduleWatchdog();
    };

    const handleDragOver = (e: DragEvent) => {
      if (!hasDragDataFromOutside(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsWindowDragging(true);
      // Ensure Universal Input Hub is open
      setSidebarActiveTab('input');
      setIsSidebarOpen(true);
      scheduleWatchdog();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      const related = e.relatedTarget as Node | null;
      const leftViewport =
        !related ||
        !document.documentElement.contains(related) ||
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight;

      if (leftViewport) {
        clearWindowDrag();
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      clearWindowDrag();

      // Ensure Universal Input Hub is open and active
      setSidebarActiveTab('input');
      setIsSidebarOpen(true);

      const targetEl = e.target as HTMLElement | null;
      const droppedInsideDropZone = Boolean(targetEl?.closest?.('#universal-dropzone'));

      // If dropped outside DropZone, handle it here (DropZone handles its own drops):
      if (!droppedInsideDropZone && e.dataTransfer) {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const file = files[0];
          setPendingDroppedFile(file);
          showToast(`📄 Loaded file "${file.name}" into Universal Input Hub`);
          return;
        }

        const link = extractLinkFromDataTransfer(e.dataTransfer);
        if (link) {
          setPendingDroppedUrl(link);
          showToast(`🔗 Loaded link into Universal Input Hub`);
          return;
        }

        const text = e.dataTransfer.getData('text/plain');
        if (text && text.trim()) {
          setPendingDroppedText(text.trim());
          showToast(`📝 Loaded text into Universal Input Hub`);
          return;
        }
      }
    };

    const handleDragEndOrCancel = () => {
      clearWindowDrag();
    };

    window.addEventListener('dragenter', handleDragEnter, { capture: true });
    window.addEventListener('dragover', handleDragOver, { capture: true });
    window.addEventListener('dragleave', handleDragLeave, { capture: true });
    window.addEventListener('drop', handleDrop, { capture: true });
    window.addEventListener('dragend', handleDragEndOrCancel, { capture: true });
    window.addEventListener('mousemove', handleDragEndOrCancel, { capture: true, passive: true });
    window.addEventListener('mousedown', handleDragEndOrCancel, { capture: true, passive: true });
    window.addEventListener('keydown', handleDragEndOrCancel, { capture: true, passive: true });
    window.addEventListener('blur', handleDragEndOrCancel);

    return () => {
      clearWindowDrag();
      window.removeEventListener('dragenter', handleDragEnter, { capture: true });
      window.removeEventListener('dragover', handleDragOver, { capture: true });
      window.removeEventListener('dragleave', handleDragLeave, { capture: true });
      window.removeEventListener('drop', handleDrop, { capture: true });
      window.removeEventListener('dragend', handleDragEndOrCancel, { capture: true });
      window.removeEventListener('mousemove', handleDragEndOrCancel, { capture: true });
      window.removeEventListener('mousedown', handleDragEndOrCancel, { capture: true });
      window.removeEventListener('keydown', handleDragEndOrCancel, { capture: true });
      window.removeEventListener('blur', handleDragEndOrCancel);
    };
  }, [clearWindowDrag, showToast]);

  const handleStartTimer = useCallback((durationMinutes = 15, presetLabel?: string) => {
    const totalSecs = durationMinutes * 60;
    setInitialTimerDuration(totalSecs);
    setTimerSecondsRemaining(totalSecs);
    setIsTimerSet(true);
    setIsTimerRunning(true);
    focusBlockStartWordIndexRef.current = currentIndex;
    focusBlockPresetLabelRef.current = presetLabel || `${durationMinutes}m Focus Block`;
    if (!settings.doNotDisturb) {
      showToast(`⏱️ ${durationMinutes} min focus timer started`);
    }
  }, [currentIndex, settings.doNotDisturb, showToast]);

  const handleStartBreak = useCallback((minutes = 5) => {
    setIsPlaying(false);
    handleStartTimer(minutes, `${minutes}m Rest Break`);
    showToast(`☕ ${minutes} min break started. Relax and recharge!`);
  }, [handleStartTimer, showToast]);

  const handleStartNextBlock = useCallback((minutes = 15) => {
    handleStartTimer(minutes, `${minutes}m Focus Block`);
  }, [handleStartTimer]);

  const handlePauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleResumeTimer = useCallback(() => {
    if (timerSecondsRemaining > 0) {
      setIsTimerRunning(true);
    }
  }, [timerSecondsRemaining]);

  const handleResetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setIsTimerSet(false);
    setTimerSecondsRemaining(0);
    setInitialTimerDuration(0);
  }, []);

  const handleAdjustTimer = useCallback((deltaSeconds: number) => {
    setTimerSecondsRemaining((prev) => Math.max(10, prev + deltaSeconds));
  }, []);

  // Formatted Timer String for Header
  const timerFormatted = useMemo(() => {
    const m = Math.floor(timerSecondsRemaining / 60);
    const s = timerSecondsRemaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [timerSecondsRemaining]);

  // Save settings on update
  const handleUpdateSettings = useCallback((updater: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updater };
      if (updater.letterSpacingPreset !== undefined && updater.letterSpacing === undefined) {
        next.letterSpacing = resolveLetterSpacingEm({ letterSpacingPreset: updater.letterSpacingPreset });
      } else if (updater.letterSpacing !== undefined && updater.letterSpacingPreset === undefined) {
        next.letterSpacingPreset = resolveLetterSpacingPreset({ letterSpacing: updater.letterSpacing });
      }
      try {
        safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // Ignore
    }
  };

  // Fallback words when handle is initializing or for default sample text
  const fallbackSampleWords = useMemo(() => {
    return parseTextIntoWords(SAMPLE_TEXTS[0].text, settings.highlightStyle);
  }, [settings.highlightStyle]);

  // Phase 4.5: Windowed Reader Hook with chunk caching & prefetching
  const readerWindow = useReaderWindow({
    handle: activeDocumentHandle,
    currentIndex,
    fallbackWords: fallbackSampleWords,
    highlightStyle: settings.highlightStyle,
  });

  const parsedWords = readerWindow.windowWords;
  const totalWords = readerWindow.totalWords;

  // Keep index within bounds of total document words
  useEffect(() => {
    if (totalWords > 0 && currentIndex >= totalWords) {
      setCurrentIndex(0);
    }
  }, [totalWords, currentIndex]);

  // Dev-only timing instrumentation for initial reader render
  const lastRenderedDocRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastRenderedDocRef.current !== activeDocId) {
      lastRenderedDocRef.current = activeDocId;
      const start = performance.now();
      requestAnimationFrame(() => {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        logDevDiagnostic('initial reader render', {
          durationMs,
          totalWords,
          activeDocId,
        });
      });
    }
  }, [activeDocId, totalWords]);

  // Save text changes via Phase 2 Scalable Document Service
  const handleApplyText = useCallback(
    async (
      text: string,
      title?: string,
      existingId?: string,
      options?: Partial<SavedDocument> & {
        structure?: any;
        pages?: any[];
      }
    ) => {
      const validText = text && text.trim() ? text : SAMPLE_TEXTS[0].text;
      const validTitle = title || 'Custom Reading';
      const docId = existingId || createUniqueDocumentId('doc');
      const excerpt = options?.excerpt || buildHistoryExcerpt(validText);

      setCurrentTitle(validTitle);
      activeDocIdRef.current = docId;
      setActiveDocId(docId);
      setCurrentIndex(0);
      setIsPlaying(false);
      setSessionWordsRead(0);

      try {
        // 1. Asynchronously persist metadata + chunks + structure to IndexedDB
        const { metadata, structure } = await documentStorageService.createAndSaveDocument({
          id: docId,
          title: validTitle,
          text: validText,
          sourceType: options?.sourceType || 'text',
          sourceUrl: options?.sourceUrl,
          fileName: options?.fileName,
          direction: options?.direction,
          category: options?.category,
          lastReadWordIndex: 0,
          structure: options?.structure,
          pages: options?.pages,
        });

        // Immediately sync active metadata/structure & refresh handle so Overview never lags or shows 0 words
        if (activeDocIdRef.current === docId) {
          setActiveMetadata(metadata);
          setActiveStructure(structure);
          setDocumentRevision((rev) => rev + 1);
        }

        // 2. Persist ONLY lightweight pointers to localStorage (never store giant raw text)
        safeStorage.setItem(STORAGE_KEYS.ACTIVE_DOC_ID, docId);
        safeStorage.setItem(STORAGE_KEYS.CURRENT_TITLE, validTitle);
        safeStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, '0');
        safeStorage.removeItem(STORAGE_KEYS.CURRENT_TEXT);

        // Phase 6: Large Document Detection (Part A) & Overview Trigger (Part B)
        const sizeClassification = classifyDocumentSize({
          totalWords: metadata.totalWords,
          pageCount: structure?.pages?.length,
          totalCharacters: metadata.totalCharacters,
          sourceType: options?.sourceType || 'text',
        });

        if (sizeClassification.isLargeOrAbove) {
          setSidebarActiveTab('overview');
          setIsSidebarOpen(true);
        }

        // 3. Update lightweight saved docs in React state and localStorage (deduped strictly by ID, never by title)
        setSavedDocs((prev) => {
          const newDoc: SavedDocument = {
            id: docId,
            title: validTitle,
            wordCount: metadata.totalWords,
            lastReadIndex: 0,
            lastReadDate: new Date().toISOString(),
            category: options?.category,
            sourceType: options?.sourceType || 'text',
            sourceUrl: options?.sourceUrl,
            fileName: options?.fileName,
            direction: metadata.direction,
            totalCharacters: metadata.totalCharacters,
            pageCount: structure.pages?.length,
            hasStructure: Boolean(structure),
            excerpt,
          };

          const updated = upsertHistoryDocument(prev, newDoc);
          safeStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.error('Error saving document to IndexedDB storage:', err);
      }
    },
    []
  );

  // Import handler for structured ReaderDocument objects
  const handleImportDocument = useCallback(
    (doc: ReaderDocument) => {
      const title = doc.title || doc.fileName || 'Imported Reading';
      handleApplyText(doc.content, title, doc.id, {
        sourceType: doc.sourceType,
        sourceUrl: doc.sourceUrl,
        fileName: doc.fileName,
        direction: doc.direction,
        structure: doc.structure,
        pages: doc.pages,
      });
    },
    [handleApplyText]
  );

  // Check for captured text from Chrome Extension (URL params, storage, or runtime message)
  useEffect(() => {
    let isMounted = true;

    const checkCapturedText = async (): Promise<boolean> => {
      try {
        const stored = await getStoredCapturedText();
        if (stored && stored.text && stored.text.trim()) {
          if (!isMounted) return true;
          handleApplyText(stored.text, stored.title || 'Web Selection');
          showToast(`⚡ Loaded highlighted text from ${stored.title || 'webpage'}`);
          await clearStoredCapturedText();
          return true;
        }
      } catch (err) {
        console.warn('Error checking captured text:', err);
      }
      return false;
    };

    let timer1: NodeJS.Timeout | null = null;
    let timer2: NodeJS.Timeout | null = null;

    // Immediate check
    checkCapturedText().then((found) => {
      // If not immediately found in storage, check again after short intervals
      // to account for any storage I/O delay between background worker & tab launch
      if (!found && isMounted) {
        timer1 = setTimeout(checkCapturedText, 150);
        timer2 = setTimeout(checkCapturedText, 500);
      }
    });

    // Listen for real-time messages ONLY in verified Chrome Extension environment
    let messageListener: ((message: any) => void) | null = null;
    try {
      if (isChromeExtensionEnvironment() && typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
        messageListener = (message: any) => {
          if (message && message.action === 'NEW_CAPTURED_TEXT' && message.text) {
            handleApplyText(message.text, message.title || 'Web Selection');
            showToast(`⚡ Captured highlighted text: "${message.title || 'Web Selection'}"`);
          }
        };

        chrome.runtime.onMessage.addListener(messageListener);
      }
    } catch (err) {
      console.warn('Could not attach extension message listener:', err);
    }

    return () => {
      isMounted = false;
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      try {
        if (messageListener && isChromeExtensionEnvironment() && typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
          chrome.runtime.onMessage.removeListener(messageListener);
        }
      } catch {
        // ignore
      }
    };
  }, [handleApplyText, showToast]);

  const handleDeleteDocument = useCallback((id: string) => {
    // Delete from IndexedDB asynchronously
    documentStorageService.deleteDocument(id).catch((err) => {
      console.warn('Error deleting document from IndexedDB:', err);
    });

    setSavedDocs((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      try {
        safeStorage.setItem(STORAGE_KEYS.SAVED_DOCS, JSON.stringify(filtered));
      } catch {
        // Ignore
      }
      return filtered;
    });
  }, []);

  // Debounced persistence for currentIndex to prevent disk I/O thrashing during 5-10 words/sec RSVP playback
  const indexSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIndexSaveRef = useRef<number | null>(null);

  const flushIndexSave = useCallback(() => {
    if (pendingIndexSaveRef.current !== null) {
      const idx = pendingIndexSaveRef.current;
      try {
        safeStorage.setItem(STORAGE_KEYS.CURRENT_INDEX, idx.toString());
      } catch {
        // Ignore
      }
      // Also update progress in IndexedDB asynchronously
      if (activeDocId) {
        documentStorageService.updateReadingProgress(activeDocId, idx).catch(() => {});
      }
      pendingIndexSaveRef.current = null;
    }
  }, [activeDocId]);

  // Save index on change (React state updates immediately; storage write is debounced)
  const handleIndexChange = useCallback((newIdx: number) => {
    setIsAutoPaused(false);
    setAutoPauseReason(null);
    const validIdx = Math.max(0, isNaN(newIdx) || !isFinite(newIdx) ? 0 : Math.floor(newIdx));
    setCurrentIndex(validIdx);
    pendingIndexSaveRef.current = validIdx;

    if (!indexSaveTimeoutRef.current) {
      indexSaveTimeoutRef.current = setTimeout(() => {
        indexSaveTimeoutRef.current = null;
        flushIndexSave();
      }, 750);
    }
  }, [flushIndexSave]);

  // Flush pending index whenever playback stops
  useEffect(() => {
    if (!isPlaying) {
      flushIndexSave();
    }
  }, [isPlaying, flushIndexSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushIndexSave();
    };
  }, [flushIndexSave]);

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const totalWordsRef = useRef(totalWords);
  useEffect(() => {
    totalWordsRef.current = totalWords;
  }, [totalWords]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const isAutoPausedRef = useRef(isAutoPaused);
  isAutoPausedRef.current = isAutoPaused;

  const handleAutoPause = useCallback((reason: AutoPauseReason) => {
    isPlayingRef.current = false;
    isAutoPausedRef.current = true;
    setIsPlaying(false);
    setIsAutoPaused(true);
    setAutoPauseReason(reason);

    // Auto-pause feature controls reading stats & focus timer:
    // If a focus timer was actively counting down, freeze it and remember to resume on return
    if (isTimerRunning) {
      wasTimerRunningBeforeAutoPauseRef.current = true;
      setIsTimerRunning(false);
    }

    const reasonText = reason === 'mouse' ? 'cursor left window' : 'window lost focus';
    showToast(`⏸️ Smart Auto-Paused (${reasonText})`);
  }, [isTimerRunning, showToast]);

  const resetCurrentRunRef = useRef<() => void>(() => {});

  const executeResume = useCallback(() => {
    isAutoPausedRef.current = false;
    isPlayingRef.current = true;
    setIsAutoPaused(false);
    setAutoPauseReason(null);

    // Resuming reading: If focus timer was paused by auto-pause, resume the timer!
    if (wasTimerRunningBeforeAutoPauseRef.current && timerSecondsRemaining > 0) {
      setIsTimerRunning(true);
      wasTimerRunningBeforeAutoPauseRef.current = false;
    }

    if (currentIndexRef.current >= totalWordsRef.current - 1) {
      resetCurrentRunRef.current();
      handleIndexChange(0);
    }

    setIsPlaying(true);
  }, [handleIndexChange, timerSecondsRemaining]);

  // Hook for Smart Auto-Pause (with transition-state play intent queuing)
  const smartAutoPause = useSmartAutoPause({
    isPlaying,
    enabled: settings.smartAutoPause !== false,
    onAutoPause: handleAutoPause,
    onResumeQueued: executeResume,
  });

  // Phase 6: Canonical Navigation Handler across Overview, Minimap, Jump, & Chapters (Part K)
  const handleNavigateToPosition = useCallback(
    async (target: ResolvedDocumentPosition | { globalWordIndex: number }) => {
      const targetIdx = Math.max(0, target.globalWordIndex);
      smartAutoPause.cancelQueuedPlay();
      handleIndexChange(targetIdx);
      isPlayingRef.current = false;
      setIsPlaying(false);
      try {
        await activeDocumentHandle.updateProgress(targetIdx);
        if (activeDocumentHandle.resolveWordIndex) {
          const resolved = await activeDocumentHandle.resolveWordIndex(targetIdx);
          setNavigationState({
            documentId: activeDocId,
            position: { kind: 'word', wordIndex: targetIdx },
            resolvedPosition: resolved,
            viewMode,
          });
        }
      } catch (err) {
        console.warn('Error updating position in handle:', err);
      }
    },
    [activeDocumentHandle, activeDocId, handleIndexChange, smartAutoPause, viewMode]
  );

  const handleStartFromBeginning = useCallback(() => {
    handleNavigateToPosition({ globalWordIndex: 0 });
  }, [handleNavigateToPosition]);

  const handleResumePlay = useCallback(() => {
    smartAutoPause.consumeRecentQueuedResume();
    const result = smartAutoPause.requestPlay('click');
    if (result === 'immediate') {
      executeResume();
    }
  }, [executeResume, smartAutoPause]);

  const handlePlayPointerDown = useCallback(() => {
    if (isAutoPausedRef.current || !isPlayingRef.current) {
      smartAutoPause.queuePlayIfTransitioning();
    }
  }, [smartAutoPause]);

  const handleTogglePlay = useCallback(() => {
    // If pointerdown already queued and flushed a resume for this exact click gesture,
    // keep playback running rather than toggling it back to paused.
    if (smartAutoPause.consumeRecentQueuedResume()) {
      return;
    }

    if (isAutoPausedRef.current || !isPlayingRef.current) {
      const result = smartAutoPause.requestPlay('click');
      if (result === 'immediate') {
        executeResume();
      }
      return;
    }

    // Explicit pause by user: cancel any queued play intent and do not auto-resume timer later
    smartAutoPause.cancelQueuedPlay();
    wasTimerRunningBeforeAutoPauseRef.current = false;
    isAutoPausedRef.current = false;
    isPlayingRef.current = false;
    setIsAutoPaused(false);
    setAutoPauseReason(null);
    setIsPlaying(false);
  }, [executeResume, smartAutoPause]);

  const handleUndoRestart = useCallback(() => {
    const snapshot = restartUndoRef.current;
    if (!snapshot || snapshot.documentId !== activeDocId) return;

    restartUndoRef.current = null;
    setCanUndoRestart(false);
    setSessionWordsRead(snapshot.previousSessionWordsRead);
    handleIndexChange(snapshot.previousIndex);
    showToast(`Restored position (word ${snapshot.previousIndex + 1})`, {
      durationMs: 3000,
      bypassDnd: true,
    });
  }, [activeDocId, handleIndexChange, showToast]);

  const handleRestart = useCallback(() => {
    const previousIndex = currentIndexRef.current;
    const previousSessionWordsRead = sessionWordsReadRef.current;

    smartAutoPause.cancelQueuedPlay();
    isAutoPausedRef.current = false;
    isPlayingRef.current = false;
    setIsAutoPaused(false);
    setAutoPauseReason(null);
    setIsPlaying(false);
    setSessionWordsRead(0);
    resetCurrentRunRef.current();
    handleIndexChange(0);

    if (previousIndex > 0 || previousSessionWordsRead > 0) {
      restartUndoRef.current = {
        documentId: activeDocId,
        previousIndex,
        previousSessionWordsRead,
      };
      setCanUndoRestart(true);
      showToast(`Restarted from beginning (was at word ${previousIndex + 1})`, {
        actionLabel: 'Undo',
        onAction: () => {
          const snap = restartUndoRef.current;
          if (!snap || snap.documentId !== activeDocId) return;
          restartUndoRef.current = null;
          setCanUndoRestart(false);
          setSessionWordsRead(snap.previousSessionWordsRead);
          handleIndexChange(snap.previousIndex);
          showToast(`Restored position (word ${snap.previousIndex + 1})`, {
            durationMs: 3000,
            bypassDnd: true,
          });
        },
        durationMs: 8000,
        bypassDnd: true,
      });
    }
  }, [activeDocId, handleIndexChange, showToast, smartAutoPause]);

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Listen to fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const isAnyModalOpen =
    isSidebarOpen ||
    isSettingsOpen ||
    isShortcutsOpen ||
    isExtensionHubOpen ||
    isTimerModalOpen ||
    isMilestoneModalOpen ||
    isStatsModalOpen;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = resolveKeyboardShortcut(extractShortcutKeyEvent(e), {
        isAnyModalOpen,
        isShortcutsModalOpen: isShortcutsOpen || isExtensionHubOpen,
        canUndoRestart,
      });

      if (!action) return;

      switch (action.type) {
        case 'open_input_hub':
          e.preventDefault();
          setSidebarActiveTab('input');
          setIsSidebarOpen(true);
          return;

        case 'undo_restart':
          e.preventDefault();
          handleUndoRestart();
          return;

        case 'font_decrease':
          e.preventDefault();
          if (viewMode === 'flow') {
            const currentFlowSize = settings.flowFontSize || 22;
            const nextSize = Math.max(14, currentFlowSize - 2);
            handleUpdateSettings({ flowFontSize: nextSize });
            showToast(`🔤 Flow Font Size: ${nextSize}px`);
          } else {
            const nextSize = Math.max(20, settings.fontSize - 4);
            handleUpdateSettings({ fontSize: nextSize });
            showToast(`🔤 Font Size: ${nextSize}px`);
          }
          return;

        case 'font_increase':
          e.preventDefault();
          if (viewMode === 'flow') {
            const currentFlowSize = settings.flowFontSize || 22;
            const nextSize = Math.min(52, currentFlowSize + 2);
            handleUpdateSettings({ flowFontSize: nextSize });
            showToast(`🔤 Flow Font Size: ${nextSize}px`);
          } else {
            const nextSize = Math.min(100, settings.fontSize + 4);
            handleUpdateSettings({ fontSize: nextSize });
            showToast(`🔤 Font Size: ${nextSize}px`);
          }
          return;

        case 'toggle_play':
          e.preventDefault();
          handleTogglePlay();
          return;

        case 'seek_relative':
          e.preventDefault();
          handleIndexChange(Math.max(0, Math.min(totalWords - 1, currentIndex + action.delta)));
          return;

        case 'wpm_delta':
          e.preventDefault();
          handleUpdateSettings({
            wpm: Math.max(60, Math.min(1000, settings.wpm + action.delta)),
          });
          return;

        case 'restart':
          e.preventDefault();
          handleRestart();
          return;

        case 'toggle_fullscreen':
          handleToggleFullscreen();
          return;

        case 'toggle_view_mode':
          setViewMode((m) => (m === 'rsvp' ? 'flow' : 'rsvp'));
          return;

        case 'toggle_metronome':
          handleUpdateSettings({ metronomeSound: !settings.metronomeSound });
          return;

        case 'toggle_narration':
          handleUpdateSettings({ speechNarration: !settings.speechNarration });
          showToast(!settings.speechNarration ? '🎙️ Voice-Over Narration Enabled' : '🔇 Voice-Over Narration Disabled');
          return;

        case 'toggle_timer_modal':
          setIsTimerModalOpen((prev) => !prev);
          return;

        case 'toggle_stats_modal':
          setIsStatsModalOpen((prev) => !prev);
          return;

        case 'toggle_sidebar_overview':
          setSidebarActiveTab('overview');
          setIsSidebarOpen((prev) => !prev);
          return;

        case 'toggle_theme':
          handleUpdateSettings({ theme: settings.theme === 'light' ? 'midnight' : 'light' });
          return;

        case 'toggle_shortcuts':
          e.preventDefault();
          setExtensionHubInitialTab('shortcuts');
          setIsExtensionHubOpen((prev) => !prev);
          return;

        case 'close_modals':
          setIsSidebarOpen(false);
          setIsSettingsOpen(false);
          setIsShortcutsOpen(false);
          setIsExtensionHubOpen(false);
          setIsTimerModalOpen(false);
          setIsMilestoneModalOpen(false);
          setIsStatsModalOpen(false);
          return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnyModalOpen,
    isShortcutsOpen,
    isExtensionHubOpen,
    canUndoRestart,
    handleTogglePlay,
    handleIndexChange,
    handleRestart,
    handleUndoRestart,
    handleToggleFullscreen,
    settings.wpm,
    settings.metronomeSound,
    settings.speechNarration,
    settings.theme,
    settings.fontSize,
    settings.flowFontSize,
    viewMode,
    totalWords,
    currentIndex,
    handleUpdateSettings,
    showToast,
  ]);

  // Global Paste Handler: captures native Ctrl/Cmd+V (and Edit > Paste) outside text fields
  // directly from ClipboardEvent.clipboardData without swallowing keydown or requiring clipboard permissions.
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!shouldHandleGlobalPaste(e.target)) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const html = clipboardData.getData('text/html') || '';
      const plain = clipboardData.getData('text/plain') || '';
      const extracted = extractClipboardContent(html, plain);
      const textToUse =
        extracted && extracted.trim()
          ? extracted.trim()
          : plain && plain.trim()
            ? plain.trim()
            : '';

      if (textToUse) {
        e.preventDefault();
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsExtensionHubOpen(false);
        setIsTimerModalOpen(false);
        setIsMilestoneModalOpen(false);
        setIsStatsModalOpen(false);
        setSidebarActiveTab('input');
        setIsSidebarOpen(true);
        setPendingDroppedText(textToUse);
        showToast('📋 Loaded clipboard text into Universal Input Hub');
        return;
      }

      const pastedFile =
        clipboardData.files && clipboardData.files.length > 0 ? clipboardData.files[0] : null;
      if (pastedFile) {
        e.preventDefault();
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
        setIsExtensionHubOpen(false);
        setIsTimerModalOpen(false);
        setIsMilestoneModalOpen(false);
        setIsStatsModalOpen(false);
        setSidebarActiveTab('input');
        setIsSidebarOpen(true);
        setPendingDroppedFile(pastedFile);
        showToast(`📄 Loaded ${pastedFile.name} into Universal Input Hub`);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [showToast]);

  const isIdle = useControlsIdle({
    isPlaying,
    isAnyModalOpen,
  });

  const currentThemeConfig = getTheme(settings.theme);

  // Heatmap Dwell Time & Complexity Tracking Engine
  const {
    heatmapData,
    statsSummary,
    currentRunStats,
    resetCurrentRun,
    resetHeatmap,
    clearAllStats,
  } = useReadingHeatmap({
    words: parsedWords,
    totalWords,
    currentIndex,
    isPlaying,
    wpm: settings.wpm,
    documentTitle: currentTitle,
    documentId: activeDocId,
    isIdle: false,
    isAutoPaused,
    warmupStatus,
  });
  resetCurrentRunRef.current = resetCurrentRun;

  // Smart detection of input text language: Farsi vs English
  const isCurrentTextFarsi = useMemo(() => {
    if (activeMetadata?.direction === 'rtl') return true;
    if (activeMetadata?.title && isRtlText(activeMetadata.title)) return true;
    if (settings.fontFamily === 'vazirmatn') return true;
    if (typeof settings.speechVoiceURI === 'string' && settings.speechVoiceURI.startsWith('farsi-')) return true;
    return false;
  }, [activeMetadata, settings.fontFamily, settings.speechVoiceURI]);

  return (
    <div 
      id="adhd-reader-app"
      className={`h-screen max-h-screen overflow-hidden flex flex-col ${currentThemeConfig.bgClass} ${currentThemeConfig.textPrimary} transition-colors duration-200 select-none`}
    >
      {/* Toast Notification (with optional Undo action) */}
      {toastNotification && (
        <div
          id="app-toast-notification"
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-red-500/50 text-white shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          <Zap className="w-4 h-4 text-red-500 fill-red-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold">{toastNotification.message}</span>
          {toastNotification.actionLabel && toastNotification.onAction && (
            <button
              id="toast-undo-btn"
              type="button"
              onClick={toastNotification.onAction}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Undo restart (Ctrl/Cmd + Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{toastNotification.actionLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Top Navigation / Header */}
      {!isFullscreen && (
        <Header
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          onOpenSidebar={() => {
            setSidebarActiveTab('overview');
            setIsSidebarOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenShortcuts={() => {
            setExtensionHubInitialTab('shortcuts');
            setIsExtensionHubOpen(true);
          }}
          onOpenExtensionHub={() => {
            setExtensionHubInitialTab('simulator');
            setIsExtensionHubOpen(true);
          }}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          currentTitle={currentTitle}
          isIdle={isIdle}
          timerFormatted={timerFormatted}
          isTimerRunning={isTimerRunning}
          isTimerSet={isTimerSet}
          onOpenTimerModal={() => setIsTimerModalOpen(true)}
          onOpenStatsModal={() => setIsStatsModalOpen(true)}
        />
      )}

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden">
        {viewMode === 'rsvp' ? (
          <RSVPReader
            words={parsedWords}
            totalWords={totalWords}
            handle={activeDocumentHandle}
            getWordsSlice={readerWindow.getWordsSlice}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onRestart={handleRestart}
            isIdle={isIdle}
            heatmapData={heatmapData}
            onResetHeatmap={resetHeatmap}
            onOpenStatsModal={() => setIsStatsModalOpen(true)}
            isAutoPaused={isAutoPaused}
            autoPauseReason={autoPauseReason}
            onResume={handleResumePlay}
            onPlayPointerDown={handlePlayPointerDown}
            warmupStatus={warmupStatus}
            onWordStep={handleWordStep}
            onSkipWarmup={handleSkipWarmup}
            onResetWarmup={handleResetWarmup}
            onSwitchToFlow={() => setViewMode('flow')}
            actualWpm={currentRunStats.actualWpm}
          />
        ) : (
          <FlowReader
            words={parsedWords}
            totalWords={totalWords}
            handle={activeDocumentHandle}
            getWordsSlice={readerWindow.getWordsSlice}
            currentIndex={currentIndex}
            onIndexChange={handleIndexChange}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onRestart={handleRestart}
            onSwitchToRsvp={() => setViewMode('rsvp')}
            isIdle={isIdle}
            heatmapData={heatmapData}
            onResetHeatmap={resetHeatmap}
            onOpenStatsModal={() => setIsStatsModalOpen(true)}
            warmupStatus={warmupStatus}
            onWordStep={handleWordStep}
            onSkipWarmup={handleSkipWarmup}
            onResetWarmup={handleResetWarmup}
            onPlayPointerDown={handlePlayPointerDown}
          />
        )}
      </main>

      {/* Persistent Bottom Edge Visual Heatmap Progress Line */}
      {settings.showHeatmapProgress !== false && heatmapData && (
        <div
          id="screen-bottom-heatmap-indicator"
          className="fixed bottom-0 inset-x-0 h-1 sm:h-1.5 z-30 transition-all duration-300 opacity-85 hover:opacity-100 pointer-events-none"
          style={{
            background: heatmapData.gradientCss,
            boxShadow: '0 -1px 6px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Active playhead point on bottom edge */}
          <div
            className="absolute top-0 bottom-0 w-2.5 -translate-x-1/2 bg-white shadow-md rounded-full"
            style={{
              left: `${totalWords > 0 ? (currentIndex / Math.max(1, totalWords - 1)) * 100 : 0}%`,
            }}
          />
        </div>
      )}

      {/* Modals & Drawers */}
      {/* Left Sidebar: Merged Content & Overview + Universal Text Input Hub */}
      <DocumentSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpen={(tab) => {
          if (tab) setSidebarActiveTab(tab);
          setIsSidebarOpen(true);
        }}
        activeTab={sidebarActiveTab}
        onTabChange={setSidebarActiveTab}
        documentId={activeDocId}
        handle={activeDocumentHandle}
        metadata={activeMetadata}
        structure={activeStructure}
        totalWords={totalWords}
        currentWordIndex={currentIndex}
        onNavigateToPosition={handleNavigateToPosition}
        onStartFromBeginning={handleStartFromBeginning}
        currentText=""
        currentTitle={currentTitle}
        onApplyText={handleApplyText}
        onImportDocument={handleImportDocument}
        savedDocuments={savedDocs}
        onDeleteDocument={handleDeleteDocument}
        onOpenExtensionHub={() => {
          setIsSidebarOpen(false);
          setIsExtensionHubOpen(true);
        }}
        initialDroppedFile={pendingDroppedFile}
        onClearDroppedFile={() => setPendingDroppedFile(null)}
        initialDroppedUrl={pendingDroppedUrl}
        onClearDroppedUrl={() => setPendingDroppedUrl(null)}
        initialDroppedText={pendingDroppedText}
        onClearDroppedText={() => setPendingDroppedText(null)}
        isWindowDragging={isWindowDragging}
        settings={settings}
        isIdle={isIdle}
      />

      <ExtensionHubModal
        isOpen={isExtensionHubOpen}
        onClose={() => setIsExtensionHubOpen(false)}
        onApplyCapturedText={(text, title) => {
          handleApplyText(text, title || 'Captured Webpage Selection');
          showToast(`⚡ Captured text loaded into Khoroos Reader!`);
        }}
        settings={settings}
        initialTab={extensionHubInitialTab}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetDefaults={handleResetDefaults}
        onOpenTimerModal={() => setIsTimerModalOpen(true)}
        warmupStatus={warmupStatus}
        onResetWarmup={handleResetWarmup}
        isFarsiContent={isCurrentTextFarsi}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        settings={settings}
      />

      {/* Focus Session Timer Modal (Requirement 4 & 5) */}
      <FocusTimerModal
        isOpen={isTimerModalOpen}
        onClose={() => setIsTimerModalOpen(false)}
        secondsRemaining={timerSecondsRemaining}
        initialDurationSeconds={initialTimerDuration}
        isRunning={isTimerRunning}
        isSet={isTimerSet}
        onStart={handleStartTimer}
        onPause={handlePauseTimer}
        onResume={handleResumeTimer}
        onReset={handleResetTimer}
        onAdjustTime={handleAdjustTimer}
        doNotDisturb={settings.doNotDisturb}
        onToggleDoNotDisturb={(dnd) => handleUpdateSettings({ doNotDisturb: dnd })}
        theme={currentThemeConfig}
        highlightHex={HIGHLIGHT_COLORS[settings.highlightColor]?.hex || '#ef4444'}
        onOpenMilestones={() => {
          setIsTimerModalOpen(false);
          setIsMilestoneModalOpen(true);
        }}
        unlockedMilestonesCount={milestonesData.unlockedMilestoneIds.length}
      />

      {/* Focus Milestones & Celebration Modal */}
      <FocusMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        milestonesData={milestonesData}
        newlyUnlockedMilestones={newlyUnlockedMilestones}
        completedSession={lastCelebratedSession}
        theme={currentThemeConfig}
        highlightHex={HIGHLIGHT_COLORS[settings.highlightColor]?.hex || '#ef4444'}
        onStartBreak={handleStartBreak}
        onStartNextBlock={handleStartNextBlock}
      />

      {/* Reading Statistics & Heatmap Analytics Modal */}
      <ReadingStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        statsSummary={statsSummary}
        settings={settings}
        currentDocumentTitle={currentTitle}
        onClearStats={clearAllStats}
      />

      {/* Global Drag & Drop Overlay */}
      {isWindowDragging && (
        <div 
          id="window-drag-overlay"
          onClick={clearWindowDrag}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150 sm:pl-[500px]"
        >
          <div className="p-7 rounded-3xl border-2 border-dashed border-red-500 bg-red-500/10 text-center max-w-md shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/30">
              <Upload className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">Drop link or file to import</h2>
            <p className="text-xs text-slate-300 mb-3">
              Release anywhere to load directly into the Universal Input Hub
            </p>
            <div className="flex items-center justify-center gap-2.5 text-[11px] font-mono text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">LINK / URL</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">PDF</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">TXT</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">MD</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
