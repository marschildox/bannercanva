import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DEFAULT_CONTENT,
  SelectedElement,
  ElementGroup,
  SQUARE_FORMATS,
  HORIZONTAL_FORMATS,
  VERTICAL_FORMATS,
} from './types/banner';
import { BannerColumn } from './components/BannerColumn';
import { BannerEditor } from './components/BannerEditor';
import { ExportToolbar } from './components/ExportToolbar';
import { ProjectMenu } from './components/ProjectMenu';
import { AiSettingsDialog } from './components/AiSettingsDialog';
import { CampaignWizard } from './components/CampaignWizard';
import { WelcomeScreen } from './components/WelcomeScreen';
import { LeftSidebar } from './components/LeftSidebar';
import { InfinityBoard, InfinityBoardRef } from './components/InfinityBoard';
import { FixedScale } from './components/FixedScale';
import { PropagationArrow } from './components/PropagationArrow';
import { ZoomControls } from './components/ZoomControls';
import { useBannerManager } from './hooks/useBannerManager';
import { useCustomFormats } from './hooks/useCustomFormats';
import { useAutoThumbnails } from './hooks/useAutoThumbnails';
import { useAutoTextContrast } from './hooks/useAutoTextContrast';
import { Button } from './components/ui/button';
import { ChevronRight, PanelLeft, Sparkles, Wand2, KeyRound, HelpCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { createGroup, dissolveGroup } from './utils/group-helpers';
import { computeSmartLayout } from './utils/smart-positioning';
import type { BannerTemplate } from './data/templates';
import { loadAiSettings } from './services/ai/settings';
import { hasSeenWelcome, markWelcomeSeen } from './utils/welcome-storage';
import type { AiSettings } from './services/ai/types';

export default function App() {
  const {
    columns,
    bannerContents,
    selectedFormat,
    setSelectedFormat,
    addColumn,
    deleteColumn,
    addChildBanner,
    deleteChildBanner,
    updateBannerContent,
    getAllBanners,
    getColumnBanners,
    updateBannerThumbnail,
    bannerThumbnails,
    applySmartPositioningSingle,
    applySmartPositioningAll,
    patchTextStyles,
    replaceProject,
    startCampaign,
    hasRestoredProject,
  } = useBannerManager(DEFAULT_CONTENT);

  const { customFormats, addCustomFormat, deleteCustomFormat, getCustomFormatsByCategory } =
    useCustomFormats();

  // AI keys/model live in this browser only (see AiSettingsDialog)
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  // Shown on a first visit; reopenable from the help button
  const [welcomeOpen, setWelcomeOpen] = useState(() => !hasSeenWelcome());

  const dismissWelcome = useCallback(() => {
    markWelcomeSeen();
    setWelcomeOpen(false);
  }, []);
  const notify = useCallback(
    (message: string, kind: 'success' | 'error') =>
      kind === 'success' ? toast.success(message) : toast.error(message),
    [],
  );

  const [zoom, setZoom] = useState(0.5);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [activeBanner, setActiveBanner] = useState<string | null>(null);
  const infinityBoardRef = useRef<InfinityBoardRef>(null);

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-SELECTION & GROUPING
  // ═══════════════════════════════════════════════════════════════════
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  const handleMultiSelect = useCallback((elementId: string) => {
    setMultiSelectedIds((prev) =>
      prev.includes(elementId) ? prev.filter((id) => id !== elementId) : [...prev, elementId],
    );
    // Clear single selection when multi-selecting
    setSelectedElement(null);
  }, []);

  const handleGroupElements = useCallback(() => {
    if (multiSelectedIds.length < 2 || !selectedFormat) return;
    const content = bannerContents.get(selectedFormat.id);
    if (!content) return;

    // Use group-helpers to create a real DOM-container group
    const result = createGroup(multiSelectedIds, content, selectedFormat);
    if (!result) return;

    updateBannerContent(selectedFormat.id, result.updatedContent);
    setMultiSelectedIds([]);
    setSelectedElement({ type: 'group', id: result.group.id });
    toast.success(`Grouped ${result.group.memberIds.length} elements`);
  }, [multiSelectedIds, selectedFormat, bannerContents, updateBannerContent]);

  const handleUngroupElements = useCallback(
    (groupId: string) => {
      if (!selectedFormat) return;
      const content = bannerContents.get(selectedFormat.id);
      if (!content) return;

      // Use group-helpers to dissolve the group and restore absolute positions
      const updatedContent = dissolveGroup(groupId, content);
      updateBannerContent(selectedFormat.id, updatedContent);
      setSelectedElement(null);
      toast.success('Group dissolved');
    },
    [selectedFormat, bannerContents, updateBannerContent],
  );

  // Keyboard shortcuts for group/ungroup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+G or Cmd+G → Group
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        if (multiSelectedIds.length >= 2) {
          e.preventDefault();
          handleGroupElements();
        }
      }
      // Ctrl+Shift+G or Cmd+Shift+G → Ungroup
      if ((e.ctrlKey || e.metaKey) && e.key === 'G' && e.shiftKey) {
        if (selectedElement?.type === 'group') {
          e.preventDefault();
          handleUngroupElements(selectedElement.id);
        }
      }
      // Escape → clear multi-selection
      if (e.key === 'Escape' && multiSelectedIds.length > 0) {
        setMultiSelectedIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiSelectedIds, selectedElement, handleGroupElements, handleUngroupElements]);

  // Memoize banner lists to avoid creating new array references on every render.
  // Without this, getAllBanners() returns a fresh array each render, causing
  // useAutoThumbnails' useEffect to fire every time → infinite cycle.
  const allBannersList = useMemo(() => getAllBanners(), [getAllBanners]);

  const columnBannersList = useMemo(
    () => columns.map((_, index) => getColumnBanners(index)),
    [columns, getColumnBanners],
  );

  const columnNames = useMemo(
    () =>
      columns.map((col, index) => {
        if (index === 0) return 'Square';
        return col.category === 'horizontal' ? 'Horizontal' : 'Vertical';
      }),
    [columns],
  );

  // Auto-generate thumbnails when content changes (debounced)
  useAutoThumbnails(
    allBannersList,
    bannerContents,
    updateBannerThumbnail,
    1500, // 1.5 second debounce - only regenerate after user stops typing
  );

  // Auto-adapt text color/weight/size to the background under each text
  useAutoTextContrast(allBannersList, bannerContents, patchTextStyles);

  // Center on Super Master (250x250) on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      const superMasterId = columns[0]?.masterFormat.id;
      if (superMasterId && infinityBoardRef.current) {
        const superMasterElement = document.querySelector(`[data-banner-id="${superMasterId}"]`);
        if (superMasterElement) {
          infinityBoardRef.current.centerOn(superMasterElement as HTMLElement);
        }
      }
    }, 100); // Wait for initial render

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  const handleBannerClick = (formatId: string) => {
    const format = [...columns.flatMap((c) => [c.masterFormat, ...c.childFormats])].find(
      (f) => f.id === formatId,
    );

    if (format) {
      // Two-level activation system:
      // 1. If banner is not active, just activate it (orange border, show layers)
      // 2. If banner is already active, select the background element (blue border, editing mode)

      if (activeBanner !== formatId) {
        // First click: Activate the banner (orange border)
        setActiveBanner(formatId);
        setSelectedFormat(format);
        setSelectedElement(null); // Clear element selection — show layers list
      } else if (!selectedElement) {
        // Second click: Banner is active but no element selected → select background (blue border)
        setSelectedElement({ type: 'background' });
      }
      // If already in editing mode (element selected), clicking background again re-selects background
      // This is handled by BannerCanvas element click handlers directly

      // Center on the selected banner after a brief delay to ensure rendering
      setTimeout(() => {
        const bannerElement = document.querySelector(`[data-banner-id="${formatId}"]`);
        if (bannerElement && infinityBoardRef.current) {
          infinityBoardRef.current.centerOn(bannerElement as HTMLElement);
        }
      }, 50);
    }
  };

  // Deactivate banner when clicking on the whiteboard background
  const handleWhiteboardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInsideBanner = target.closest('[data-banner-id]');
    const isInteractiveUI = target.closest('button') || target.closest('[role="dialog"]');

    if (!isInsideBanner && !isInteractiveUI) {
      setActiveBanner(null);
      setSelectedFormat(null);
      setSelectedElement(null);
      setMultiSelectedIds([]);
    }
  };

  const handleElementSelect = (element: SelectedElement) => {
    setSelectedElement(element);
    // Clear multi-selection when single-selecting
    if (element !== null) {
      setMultiSelectedIds([]);
    }
  };

  const handleContentChange = (content: any) => {
    if (selectedFormat) {
      updateBannerContent(selectedFormat.id, content);
    }
  };

  const getContent = (formatId: string) => {
    return bannerContents.get(formatId) || DEFAULT_CONTENT;
  };

  const isMaster = (formatId: string) => {
    return columns.some((col) => col.masterFormat.id === formatId);
  };

  const isSuperMaster = (formatId: string) => {
    return formatId === columns[0]?.masterFormat.id;
  };

  const handleAddChildren = (columnIndex: number, formats: any[]) => {
    formats.forEach((format) => addChildBanner(columnIndex, format));
  };

  // Apply a template to the selected banner — or to the Super Master (whole
  // set) when nothing is selected. The current logo is preserved so applying
  // a template never wipes the user's branding.
  const handleApplyTemplate = useCallback(
    (template: BannerTemplate) => {
      const target = selectedFormat ?? columns[0]?.masterFormat;
      if (!target) return;

      const current = bannerContents.get(target.id);
      const content = template.build();
      if (current?.logo) {
        content.logo = current.logo;
        content.logoSize = current.logoSize;
        content.logoPosition = current.logoPosition;
      }

      // Lay the template out for the target format BEFORE propagating:
      // zone positions become explicit stacked coordinates (no overlapping
      // center texts) and full-bleed scrims get concrete dimensions.
      updateBannerContent(target.id, computeSmartLayout(content, target));
      const isMasterTarget =
        target.id === columns[0]?.masterFormat.id ||
        columns.some((col) => col.masterFormat.id === target.id);
      toast.success(
        `Template "${template.name}" applied${isMasterTarget ? ' — propagated to the set' : ` to ${target.name}`}`,
      );
    },
    [selectedFormat, columns, bannerContents, updateBannerContent],
  );

  // Add a banner size picked from the Sizes panel: routes it to the column of
  // its category, creating the column (with this size as master) if needed.
  const handleAddBannerSize = useCallback(
    (formatId: string) => {
      const format = [
        ...SQUARE_FORMATS,
        ...HORIZONTAL_FORMATS,
        ...VERTICAL_FORMATS,
        ...customFormats,
      ].find((f) => f.id === formatId);
      if (!format) return;

      const alreadyOnBoard = columns.some(
        (col) =>
          col.masterFormat.id === format.id || col.childFormats.some((f) => f.id === format.id),
      );
      if (alreadyOnBoard) {
        toast.info(`${format.name} is already on the board`);
        return;
      }

      const columnIndex = columns.findIndex((col) => col.category === format.category);
      if (columnIndex >= 0) {
        addChildBanner(columnIndex, format);
      } else if (format.category !== 'square') {
        addColumn(format.category, format);
      }
      toast.success(`${format.name} (${format.width}×${format.height}) added to the board`);
    },
    [columns, customFormats, addChildBanner, addColumn],
  );

  const handleRemoveChild = (columnIndex: number, formatId: string) => {
    const column = columns[columnIndex];
    const childIndex = column.childFormats.findIndex((f) => f.id === formatId);
    if (childIndex !== -1) {
      deleteChildBanner(columnIndex, childIndex);
    }
  };

  const selectedBanner = selectedFormat ? { id: selectedFormat.id, format: selectedFormat } : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors closeButton />

      {/* AI keys / model */}
      <AiSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
        settings={aiSettings}
        onSettingsChange={setAiSettings}
      />

      {/* Welcome / how-it-works */}
      <WelcomeScreen
        open={welcomeOpen}
        hasExistingProject={hasRestoredProject}
        onStartCampaign={() => {
          dismissWelcome();
          setWizardOpen(true);
        }}
        onOpenEditor={dismissWelcome}
        onClose={dismissWelcome}
      />

      {/* Guided campaign setup */}
      <CampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        aiSettings={aiSettings}
        onOpenAiSettings={() => setAiSettingsOpen(true)}
        onNotify={notify}
        onComplete={(content, options) => {
          startCampaign(content, options);
          const columnCount = 1 + (options.horizontal ? 1 : 0) + (options.vertical ? 1 : 0);
          toast.success(`Campaign created with ${columnCount} format columns`);
        }}
      />

      {/* Top Bar */}
      <div className="bg-white border-b shadow-sm z-30 relative">
        {/* The action row can exceed a narrow viewport; it scrolls inside itself
            so the document never gains a horizontal scrollbar. */}
        <div className="px-6 py-2 overflow-x-auto">
          <div className="flex items-center justify-between gap-4 min-w-max">
            <div className="flex items-center gap-3 shrink-0">
              <h1 className="text-lg whitespace-nowrap">Banner Generator</h1>
              <span className="text-xs text-gray-400 hidden lg:inline">
                Create responsive banners across multiple formats
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {/* Project: export / import / new */}
              <ProjectMenu
                columns={columns}
                bannerContents={bannerContents}
                onReplaceProject={replaceProject}
                onNotify={notify}
              />
              {/* Guided campaign setup */}
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={() => setWizardOpen(true)}
                title="Start a guided campaign: brief, brand, copy"
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">New campaign</span>
              </Button>
              {/* AI keys */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setAiSettingsOpen(true)}
                title="AI settings (API keys, model)"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              {/* How it works */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setWelcomeOpen(true)}
                title="How BannerCanva works"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {/* Smart Positioning */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  applySmartPositioningAll();
                  toast.success('Smart Layout applied to all banners');
                }}
                title="Reposition all elements in every banner to fit their format optimally"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Smart Layout All</span>
              </Button>
              {/* Export Toolbar */}
              <ExportToolbar
                selectedBanner={selectedBanner}
                columnBanners={columnBannersList}
                allBanners={allBannersList}
                columnNames={columnNames}
                prerenderedThumbnails={bannerThumbnails}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Board with Floating Sidebars */}
      <div className="flex-1 relative overflow-hidden">
        {/* Whiteboard - Infinity Board - Full Width */}
        <InfinityBoard
          zoom={zoom}
          onZoomChange={setZoom}
          ref={infinityBoardRef}
          onClick={handleWhiteboardClick}
        >
          <div className="flex gap-16 items-start">
            {columns.map((column, columnIndex) => (
              <div key={column.id} className="flex items-start gap-8">
                <BannerColumn
                  column={column}
                  columnIndex={columnIndex}
                  selectedFormatId={selectedFormat?.id || null}
                  activeBannerId={activeBanner}
                  getContent={getContent}
                  onBannerClick={handleBannerClick}
                  onAddChildren={handleAddChildren}
                  onRemoveChild={handleRemoveChild}
                  onDeleteColumn={deleteColumn}
                  zoom={zoom}
                  customFormats={getCustomFormatsByCategory(column.category)}
                  selectedElement={selectedElement}
                  onElementSelect={handleElementSelect}
                  onContentUpdate={(formatId, partialContent) => {
                    const currentContent = getContent(formatId);
                    updateBannerContent(formatId, { ...currentContent, ...partialContent });
                  }}
                  multiSelectedIds={multiSelectedIds}
                  onMultiSelect={handleMultiSelect}
                />

                {/* Horizontal Propagation Arrow - Show between columns */}
                {columnIndex < columns.length - 1 && (
                  <FixedScale zoom={zoom} className="flex items-center justify-center mt-20">
                    <PropagationArrow
                      direction="right"
                      title="Changes in this column propagate to the next"
                    />
                  </FixedScale>
                )}

                {/* Add Column Buttons - Show after last column */}
                {columnIndex === columns.length - 1 && (
                  <FixedScale zoom={zoom} className="flex flex-col gap-4 mt-20">
                    {/* Only show Add Horizontal if we don't have a horizontal column yet */}
                    {!columns.some((col) => col.category === 'horizontal') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addColumn('horizontal')}
                        className="gap-2 whitespace-nowrap"
                      >
                        <ChevronRight className="h-4 w-4" />
                        Add Horizontal
                      </Button>
                    )}
                    {/* Only show Add Vertical if we don't have a vertical column yet */}
                    {!columns.some((col) => col.category === 'vertical') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addColumn('vertical')}
                        className="gap-2 whitespace-nowrap"
                      >
                        <ChevronRight className="h-4 w-4" />
                        Add Vertical
                      </Button>
                    )}
                  </FixedScale>
                )}
              </div>
            ))}
          </div>
        </InfinityBoard>

        {/* Left Sidebar - Floating Overlay */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-20 transition-transform duration-300 ${
            sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
          }`}
          style={{ width: '360px' }}
        >
          <LeftSidebar
            onAddBannerSize={handleAddBannerSize}
            onApplyTemplate={handleApplyTemplate}
            isMasterSelected={
              !!selectedFormat && columns.some((c) => c.masterFormat.id === selectedFormat.id)
            }
            addedFormatIds={allBannersList.map((b) => b.id)}
            customFormats={customFormats}
            onAddCustomFormat={addCustomFormat}
            onDeleteCustomFormat={deleteCustomFormat}
            selectedFormat={selectedFormat}
            content={selectedFormat ? getContent(selectedFormat.id) : undefined}
            onContentChange={handleContentChange}
            onElementSelect={handleElementSelect}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>

        {/* Toggle Left Sidebar Button - Shows when collapsed */}
        {sidebarCollapsed && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-30 shadow-lg"
            title="Show Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Right Sidebar - Floating Overlay (Editor) */}
        <div className="absolute right-0 top-0 bottom-0 z-20">
          <BannerEditor
            selectedFormat={selectedFormat}
            isMaster={selectedFormat ? isMaster(selectedFormat.id) : false}
            isSuperMaster={selectedFormat ? isSuperMaster(selectedFormat.id) : false}
            content={selectedFormat ? getContent(selectedFormat.id) : DEFAULT_CONTENT}
            onContentChange={handleContentChange}
            onClose={() => setSelectedFormat(null)}
            selectedElement={selectedElement}
            onElementSelect={handleElementSelect}
            onSmartPosition={
              selectedFormat
                ? () => {
                    applySmartPositioningSingle(selectedFormat.id);
                    toast.success(`Smart Layout applied to ${selectedFormat.name}`);
                  }
                : undefined
            }
            multiSelectedIds={multiSelectedIds}
            onGroupElements={handleGroupElements}
            onUngroupElements={handleUngroupElements}
            geminiApiKey={aiSettings.geminiApiKey}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
            onNotify={notify}
          />
        </div>

        {/* Zoom Controls - Floating in bottom-right corner */}
        <div
          className={`absolute bottom-4 z-30 pointer-events-auto transition-all duration-300 ${
            selectedFormat ? 'right-[340px]' : 'right-4'
          } ${!sidebarCollapsed ? 'left-[380px]' : 'left-4'}`}
        >
          <div className="flex justify-end">
            <ZoomControls
              zoom={zoom}
              onZoomChange={setZoom}
              onZoomToFit={() =>
                infinityBoardRef.current?.zoomToFit({
                  left: sidebarCollapsed ? 0 : 360,
                  right: selectedFormat ? 320 : 0,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
