import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Sparkles, 
  Play, 
  RotateCcw, 
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Search,
  BookOpen,
  History,
  Trash2
} from 'lucide-react';
import { 
  ReaderSettings, 
  ReaderDocumentHandle, 
  DocumentMetadata, 
  DocumentStructure, 
  ResolvedDocumentPosition,
  StructuralNode,
  SearchResult,
  SavedDocument,
  ReaderDocument
} from '../types';
import { THEME_CONFIGS, HIGHLIGHT_COLORS } from '../utils/themeStyles';
import { 
  classifyDocumentSize, 
  formatSourceAwareSummary, 
  formatSourceAwarePosition 
} from '../services/structure/documentSizeClassifier';
import { DocumentMinimap } from './DocumentMinimap';
import { PageJumpControl } from './PageJumpControl';
import { ChapterNavPanel } from './ChapterNavPanel';
import { DocumentSearchBox } from './DocumentSearchBox';
import { InputHub } from './InputHub/InputHub';
import { SAMPLE_TEXTS } from '../data/sampleTexts';
import { isRtlText } from '../utils/textParser';
import { documentStorageService } from '../services/document/documentStorageService';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (tab?: 'overview' | 'input') => void;
  activeTab: 'overview' | 'input';
  onTabChange: (tab: 'overview' | 'input') => void;
  
  // Overview & Contents Props
  documentId: string;
  handle?: ReaderDocumentHandle | null;
  metadata?: DocumentMetadata | null;
  structure?: DocumentStructure | null;
  currentWordIndex: number;
  onNavigateToPosition: (resolved: ResolvedDocumentPosition | { globalWordIndex: number }) => void;
  onStartFromBeginning: () => void;
  
  // Universal Text Input Hub Props
  currentText?: string;
  currentTitle: string;
  onApplyText: (text: string, title?: string) => void;
  onImportDocument?: (doc: ReaderDocument) => void;
  savedDocuments: SavedDocument[];
  onDeleteDocument?: (id: string) => void;
  onOpenExtensionHub?: () => void;
  initialDroppedFile?: File | null;
  onClearDroppedFile?: () => void;

  // General Props
  settings: ReaderSettings;
  isIdle?: boolean;
}

export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  onClose,
  onOpen,
  activeTab,
  onTabChange,
  documentId,
  handle,
  metadata,
  structure,
  currentWordIndex,
  onNavigateToPosition,
  onStartFromBeginning,
  currentText = '',
  currentTitle,
  onApplyText,
  onImportDocument,
  savedDocuments,
  onDeleteDocument,
  onOpenExtensionHub,
  initialDroppedFile,
  onClearDroppedFile,
  settings,
  isIdle = false,
}) => {
  const [resolvedPosition, setResolvedPosition] = useState<ResolvedDocumentPosition | null>(null);
  const [overviewSubTab, setOverviewSubTab] = useState<'overview' | 'samples' | 'history'>('overview');

  const theme = THEME_CONFIGS[settings.theme] || THEME_CONFIGS.midnight;
  const highlight = HIGHLIGHT_COLORS[settings.highlightColor] || HIGHLIGHT_COLORS.red;

  // Resolve current reading position when sidebar opens or word index changes
  useEffect(() => {
    if (!isOpen || !documentId) return;

    let isMounted = true;
    const targetIdx = Math.max(0, currentWordIndex);

    if (handle && handle.resolveWordIndex) {
      handle.resolveWordIndex(targetIdx).then((res) => {
        if (isMounted) setResolvedPosition(res);
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId, handle, currentWordIndex]);

  const totalWords = metadata?.totalWords || 0;
  const pageCount = metadata?.pageCount || structure?.pages?.length || 0;
  const sourceType = metadata?.sourceType || 'text';
  const displayTitle = metadata?.title || currentTitle || 'Document Overview';
  const chapters = structure?.chapters || [];

  const sizeInfo = classifyDocumentSize({
    totalWords,
    pageCount,
    totalCharacters: metadata?.totalCharacters,
    sourceType,
  });

  const summarySubtitle = formatSourceAwareSummary({
    sourceType,
    wordCount: totalWords,
    pageCount,
    chapterCount: chapters.length,
  });

  const locationSubtitle = formatSourceAwarePosition({
    sourceType,
    resolved: resolvedPosition,
    totalWords,
    pageCount,
    structure,
  });

  // Jump handlers for Overview
  const handleJumpPage = async (pageNum: number) => {
    try {
      if (handle && handle.resolvePage) {
        const resolved = await handle.resolvePage(pageNum);
        onNavigateToPosition(resolved);
        onClose();
      } else if (structure?.pages) {
        const p = structure.pages[pageNum - 1];
        if (p) {
          onNavigateToPosition({ globalWordIndex: p.startWordIndex });
          onClose();
        }
      }
    } catch (err) {
      console.warn('Failed to jump to page:', err);
    }
  };

  const handleSelectChapter = async (node: StructuralNode) => {
    try {
      if (handle && handle.resolveChapter) {
        const resolved = await handle.resolveChapter(node.id);
        onNavigateToPosition(resolved);
        onClose();
      } else {
        onNavigateToPosition({ globalWordIndex: node.startWordIndex });
        onClose();
      }
    } catch {
      onNavigateToPosition({ globalWordIndex: node.startWordIndex });
      onClose();
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    onNavigateToPosition({ globalWordIndex: result.globalWordIndex });
    onClose();
  };

  const handleJumpPercent = (pct: number) => {
    const targetWord = Math.round((pct / 100) * Math.max(0, totalWords - 1));
    onNavigateToPosition({ globalWordIndex: targetWord });
    onClose();
  };

  const handleImportDocFromHub = (doc: ReaderDocument) => {
    if (onImportDocument) {
      onImportDocument(doc);
    } else {
      const title = doc.title || doc.fileName || 'Imported Reading';
      onApplyText(doc.content, title);
    }
    // Switch to overview or keep open for immediate table of contents reading
    onTabChange('overview');
  };

  const handleSelectSample = (sample: SavedDocument) => {
    const text = sample.text || '';
    const doc: ReaderDocument = {
      id: sample.id,
      sourceType: sample.sourceType || 'text',
      title: sample.title,
      content: text,
      direction: sample.direction || (isRtlText(text) ? 'rtl' : 'ltr'),
      metadata: {
        wordCount: sample.wordCount,
      },
    };
    if (onImportDocument) {
      onImportDocument(doc);
    } else {
      onApplyText(text, sample.title);
    }
    setOverviewSubTab('overview');
    onClose();
  };

  const handleSelectHistory = async (historyItem: SavedDocument) => {
    let content = historyItem.text;
    if (!content) {
      const dbText = await documentStorageService.getDocumentText(historyItem.id);
      if (dbText) {
        content = dbText;
      }
    }
    if (!content) {
      const sample = SAMPLE_TEXTS.find((s) => s.id === historyItem.id);
      if (sample && sample.text) {
        content = sample.text;
      }
    }
    if (!content) {
      console.warn(`[DocumentSidebar] Could not load text for history document ${historyItem.id}`);
      return;
    }

    const doc: ReaderDocument = {
      id: historyItem.id,
      sourceType: historyItem.sourceType || 'text',
      title: historyItem.title,
      content,
      direction: historyItem.direction || (isRtlText(content) ? 'rtl' : 'ltr'),
      metadata: {
        wordCount: historyItem.wordCount,
      },
    };
    if (onImportDocument) {
      onImportDocument(doc);
    } else {
      onApplyText(content, historyItem.title);
    }
    setOverviewSubTab('overview');
    onClose();
  };

  const hasPreviousProgress = currentWordIndex > 10;

  return (
    <>
      {/* 1. Left Edge Collapsed Toggle Tab */}
      {!isOpen && (
        <button
          id="sidebar-toggle-btn"
          type="button"
          onClick={() => onOpen('overview')}
          title="Open Sources & Text Input Hub"
          aria-label="Open Sources & Text Input Hub"
          className={`fixed left-0 top-20 -mt-[7px] z-30 flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-r-xl border-y border-r ${theme.borderClass} ${theme.cardBgClass} ${theme.textPrimary} shadow-xl hover:translate-x-1 active:translate-x-0 transition-all duration-300 backdrop-blur-md group ${
            isIdle ? 'opacity-0 -translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <PanelLeftOpen className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold hidden md:inline">Sources</span>
          </div>
        </button>
      )}

      {/* 2. Left Edge Backdrop Overlay */}
      {isOpen && (
        <div 
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* 3. Left Sidebar Container */}
      <aside
        id="app-left-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[480px] md:w-[520px] max-w-[95vw] flex flex-col ${theme.cardBgClass} border-r ${theme.borderClass} shadow-2xl transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-label="Document and Library Sidebar"
        aria-hidden={!isOpen}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${theme.borderClass} shrink-0`}>
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
              {activeTab === 'overview' ? (
                <Layers className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm sm:text-base font-bold ${theme.textPrimary} truncate flex items-center gap-2`}>
                <span>Document & Library Hub</span>
              </h2>
              <p className={`text-xs ${theme.textMuted} truncate`}>
                {displayTitle}
              </p>
            </div>
          </div>

          <button
            id="close-sidebar-btn"
            type="button"
            onClick={onClose}
            title="Close Sidebar (Esc)"
            aria-label="Close Sidebar"
            className={`p-1.5 rounded-lg border ${theme.borderClass} ${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface} transition-colors shrink-0`}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Merged 'Content & Overview' and 'Universal Text Input Hub' */}
        <div className={`flex items-center p-2 border-b ${theme.borderClass} bg-black/20 gap-2 shrink-0`}>
          <button
            id="sidebar-tab-overview-btn"
            type="button"
            onClick={() => onTabChange('overview')}
            aria-selected={activeTab === 'overview'}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? `${highlight.bgBadge} border shadow-xs`
                : `${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Content & Overview</span>
            {chapters.length > 0 && (
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                {chapters.length} ch
              </span>
            )}
          </button>

          <button
            id="sidebar-tab-input-btn"
            type="button"
            onClick={() => onTabChange('input')}
            aria-selected={activeTab === 'input'}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input'
                ? `${highlight.bgBadge} border shadow-xs`
                : `${theme.textMuted} hover:${theme.textPrimary} hover:${theme.accentSurface}`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Universal Input Hub</span>
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* TAB 1: Content & Overview */}
          {activeTab === 'overview' && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Overview Sub-Tabs Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  id="overview-subtab-overview-btn"
                  onClick={() => setOverviewSubTab('overview')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    overviewSubTab === 'overview'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-red-400" />
                  <span>Overview</span>
                </button>

                <button
                  type="button"
                  id="overview-subtab-samples-btn"
                  onClick={() => setOverviewSubTab('samples')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    overviewSubTab === 'samples'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sample Library</span>
                </button>

                <button
                  type="button"
                  id="overview-subtab-history-btn"
                  onClick={() => setOverviewSubTab('history')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                    overviewSubTab === 'history'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>History</span>
                  {savedDocuments.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-[10px] flex items-center justify-center text-slate-300 font-mono">
                      {savedDocuments.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Sub-Tab: Active Document Overview */}
              {overviewSubTab === 'overview' && (
                <div className="space-y-5 divide-y divide-slate-800/60">
              {/* Document Overview Metadata Header */}
              <div className="space-y-2 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${sizeInfo.badgeColor}`}>
                    {sizeInfo.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40">
                    {sourceType}
                  </span>
                  <span className={`text-xs ${theme.textMuted} font-mono ml-auto`}>
                    {summarySubtitle}
                  </span>
                </div>

                {/* Primary Action: Continue / Start Reading */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full group p-3.5 mt-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold transition-all shadow-lg shadow-red-950/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-black/25 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-bold truncate">
                        {hasPreviousProgress ? 'Continue Reading' : 'Start Reading'}
                      </div>
                      <div className="text-xs text-red-100 font-normal font-sans truncate">
                        {locationSubtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>
              </div>

              {/* Visual Minimap & Progress */}
              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="text-[11px] uppercase tracking-wider">Visual Minimap & Position</span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {Math.round((currentWordIndex / Math.max(1, totalWords)) * 100)}%
                  </span>
                </div>
                <DocumentMinimap
                  totalWords={totalWords}
                  currentWordIndex={currentWordIndex}
                  structure={structure}
                  onSeekWordIndex={(idx) => {
                    onNavigateToPosition({ globalWordIndex: idx });
                    onClose();
                  }}
                />
              </div>

              {/* Jump to Location */}
              <div className="pt-4 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Jump to Location
                </span>
                <PageJumpControl
                  sourceType={sourceType}
                  currentPage={resolvedPosition?.pageNumber || 1}
                  totalPages={pageCount}
                  totalSections={chapters.length}
                  currentSection={0}
                  currentPercent={resolvedPosition?.progressPercent || 0}
                  onJumpPage={handleJumpPage}
                  onJumpSection={(secIdx) => {
                    const node = chapters[secIdx];
                    if (node) handleSelectChapter(node);
                  }}
                  onJumpPercent={handleJumpPercent}
                />
              </div>

              {/* Search Within Document */}
              <div className="pt-4 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                  Search Document
                </span>
                <DocumentSearchBox
                  documentId={documentId}
                  handle={handle}
                  onSelectResult={handleSelectSearchResult}
                  placeholder="Search chapters, keywords, landmarks..."
                />
              </div>

              {/* Contents & Outline Hierarchy */}
              {chapters.length > 0 && (
                <div className="pt-4 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    Table of Contents ({chapters.length})
                  </span>
                  <ChapterNavPanel
                    structure={structure}
                    currentWordIndex={currentWordIndex}
                    sourceType={sourceType}
                    onSelectNode={handleSelectChapter}
                  />
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 flex items-center justify-between pb-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartFromBeginning();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start from beginning</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  Resume Reader →
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Sample Library */}
          {overviewSubTab === 'samples' && (
            <div className="space-y-3">
              <div className="pb-1">
                <h3 className="text-sm font-bold text-slate-200">Sample Library</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Curated readings designed to benchmark your RSVP speed and focus stamina:
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_TEXTS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="group p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-red-400 transition-colors">
                          {sample.title}
                        </span>
                        {sample.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                            {sample.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {sample.text}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                      <span>{sample.wordCount} words</span>
                      <span className="text-red-400 font-medium group-hover:underline">
                        Load & Read →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tab 3: History */}
          {overviewSubTab === 'history' && (
            <div className="space-y-3">
              <div className="pb-1">
                <h3 className="text-sm font-bold text-slate-200">Reading History</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Previously opened documents and reading sessions:
                </p>
              </div>
              {savedDocuments.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                  <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">No reading history yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Documents you import and read will be automatically saved here for easy resumption.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between group transition-all"
                    >
                      <div
                        onClick={() => handleSelectHistory(doc)}
                        className="flex-1 min-w-0 cursor-pointer pr-4"
                      >
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-red-400 transition-colors truncate">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{doc.wordCount} words</span>
                          <span>•</span>
                          <span>{doc.lastReadDate}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectHistory(doc)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                        >
                          Read
                        </button>
                        {onDeleteDocument && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Remove from history"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

          {/* TAB 2: Universal Text Input Hub */}
          {activeTab === 'input' && (
            <div className="p-4 sm:p-5">
              <InputHub
                currentText={currentText}
                currentTitle={currentTitle}
                onImportDocument={handleImportDocFromHub}
                savedDocuments={savedDocuments}
                onDeleteDocument={onDeleteDocument}
                settings={settings}
                onClose={onClose}
                onOpenExtensionHub={onOpenExtensionHub}
                initialDroppedFile={initialDroppedFile}
                onClearDroppedFile={onClearDroppedFile}
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
