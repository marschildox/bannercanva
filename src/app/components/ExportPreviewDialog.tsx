import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Download,
  CheckCircle2,
  Circle,
  Folder,
  Loader2,
  Settings2,
  Image as ImageIcon,
  FileImage,
  X,
} from 'lucide-react';
import { BannerFormat } from '../types/banner';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ExportProgress } from '../hooks/useBannerExport';

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allBanners: Array<{ id: string; format: BannerFormat }>;
  columnBanners: Array<Array<{ id: string; format: BannerFormat }>>;
  columnNames: string[];
  onExportSelected: (bannerIds: string[], options: ExportSettings) => void;
  onExportColumn: (columnIndex: number, bannerIds: string[], options: ExportSettings) => void;
  onExportAll: (bannerIds: string[], options: ExportSettings) => void;
  onCancelExport?: () => void;
  prerenderedThumbnails?: Map<string, string>;
  exportProgress?: ExportProgress;
  completedBannerIds?: Set<string>;
}

export interface ExportSettings {
  format: 'png' | 'jpg' | 'webp';
  scale: number;
  quality: number;
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  allBanners,
  columnBanners,
  columnNames,
  onExportSelected,
  onExportColumn,
  onExportAll,
  onCancelExport,
  prerenderedThumbnails = new Map(),
  exportProgress,
  completedBannerIds = new Set(),
}: ExportPreviewDialogProps) {
  const [selectedBanners, setSelectedBanners] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'all' | 'column'>('column');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    scale: 2,
    quality: 0.95,
  });

  const isExporting = exportProgress?.status === 'exporting';
  const isDone = exportProgress?.status === 'done';

  // Initialize all banners as selected when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBanners(new Set(allBanners.map((b) => b.id)));
    }
  }, [open, allBanners]);

  // Auto-close when done after a short delay
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDone, onOpenChange]);

  const toggleBanner = (id: string) => {
    if (isExporting) return;
    setSelectedBanners((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleColumn = (columnIndex: number) => {
    if (isExporting) return;
    const columnBannerIds = columnBanners[columnIndex].map((b) => b.id);
    const allSelected = columnBannerIds.every((id) => selectedBanners.has(id));

    setSelectedBanners((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        columnBannerIds.forEach((id) => newSet.delete(id));
      } else {
        columnBannerIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (isExporting) return;
    setSelectedBanners(new Set(allBanners.map((b) => b.id)));
  };

  const deselectAll = () => {
    if (isExporting) return;
    setSelectedBanners(new Set());
  };

  const handleExport = () => {
    const selectedIds = Array.from(selectedBanners);
    if (selectedIds.length === 0) return;

    if (selectedIds.length === allBanners.length) {
      onExportAll(selectedIds, settings);
    } else {
      onExportSelected(selectedIds, settings);
    }
  };

  const handleExportColumn = (columnIndex: number) => {
    const columnBannerIds = columnBanners[columnIndex]
      .map((b) => b.id)
      .filter((id) => selectedBanners.has(id));

    if (columnBannerIds.length === 0) return;
    onExportColumn(columnIndex, columnBannerIds, settings);
  };

  const getColumnStats = (columnIndex: number) => {
    const total = columnBanners[columnIndex].length;
    const selected = columnBanners[columnIndex].filter((b) => selectedBanners.has(b.id)).length;
    return { total, selected };
  };

  const progressPercent =
    exportProgress && exportProgress.total > 0
      ? Math.round((exportProgress.current / exportProgress.total) * 100)
      : 0;

  // Estimated file size (rough approximation)
  const estimatedSizeMB = (() => {
    const selectedFormats = allBanners.filter((b) => selectedBanners.has(b.id));
    const totalPixels = selectedFormats.reduce(
      (sum, b) => sum + b.format.width * b.format.height,
      0,
    );
    const bpp = settings.format === 'png' ? 4 : settings.format === 'jpg' ? 1.5 : 1.2;
    const scaledPixels = totalPixels * settings.scale * settings.scale;
    const rawBytes = scaledPixels * bpp;
    const compression = settings.format === 'png' ? 0.4 : settings.quality * 0.3;
    return ((rawBytes * compression) / (1024 * 1024)).toFixed(1);
  })();

  return (
    <Dialog open={open} onOpenChange={isExporting ? undefined : onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Export Preview</DialogTitle>
              <DialogDescription>Review and select banners to export</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {selectedBanners.size} / {allBanners.length} selected
              </Badge>
              {!isExporting && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-8 w-8 p-0"
                  title="Export settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Export Settings Panel */}
        {showSettings && !isExporting && (
          <div className="bg-gray-50 rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Export Settings
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Format */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(v) => setSettings((s) => ({ ...s, format: v as any }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-3.5 w-3.5" />
                        PNG (lossless)
                      </div>
                    </SelectItem>
                    <SelectItem value="jpg">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5" />
                        JPG (smaller)
                      </div>
                    </SelectItem>
                    <SelectItem value="webp">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5" />
                        WebP (modern)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scale */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Scale</Label>
                <Select
                  value={String(settings.scale)}
                  onValueChange={(v) => setSettings((s) => ({ ...s, scale: Number(v) }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x (standard)</SelectItem>
                    <SelectItem value="2">2x (retina)</SelectItem>
                    <SelectItem value="3">3x (high-res)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality (only for JPG/WebP) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Quality</Label>
                <Select
                  value={String(settings.quality)}
                  onValueChange={(v) => setSettings((s) => ({ ...s, quality: Number(v) }))}
                  disabled={settings.format === 'png'}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.7">70% (smaller)</SelectItem>
                    <SelectItem value="0.85">85% (balanced)</SelectItem>
                    <SelectItem value="0.95">95% (high quality)</SelectItem>
                    <SelectItem value="1">100% (max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Size estimate */}
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <FileImage className="h-3 w-3" />
              Estimated total size: ~{estimatedSizeMB} MB ({selectedBanners.size} banners at{' '}
              {settings.scale}x {settings.format.toUpperCase()})
            </div>
          </div>
        )}

        {/* Progress Bar (during export) */}
        {isExporting && exportProgress && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Exporting {exportProgress.currentName}...
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-blue-700">
                  {exportProgress.current} / {exportProgress.total}
                </span>
                {onCancelExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelExport}
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Done Message */}
        {isDone && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Export complete! Your files are downloading.
            </span>
          </div>
        )}

        {/* Controls */}
        {!isExporting && !isDone && (
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedBanners.size === allBanners.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedBanners.size === 0}
              >
                Deselect All
              </Button>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={groupBy === 'column' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('column')}
                className="h-7"
              >
                By Column
              </Button>
              <Button
                variant={groupBy === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setGroupBy('all')}
                className="h-7"
              >
                All Banners
              </Button>
            </div>
          </div>
        )}

        {/* Preview Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2">
          {groupBy === 'column' ? (
            <div className="space-y-6">
              {columnBanners.map((banners, columnIndex) => {
                const stats = getColumnStats(columnIndex);
                const allColumnSelected = stats.selected === stats.total;
                const someColumnSelected = stats.selected > 0 && stats.selected < stats.total;

                return (
                  <div key={columnIndex} className="space-y-3">
                    {/* Column Header */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allColumnSelected}
                          onCheckedChange={() => toggleColumn(columnIndex)}
                          className={someColumnSelected ? 'data-[state=checked]:bg-orange-500' : ''}
                          disabled={isExporting}
                        />
                        <div>
                          <h3 className="font-semibold text-sm">{columnNames[columnIndex]}</h3>
                          <p className="text-xs text-gray-500">
                            {stats.selected} of {stats.total} banners selected
                          </p>
                        </div>
                      </div>
                      {!isExporting && !isDone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportColumn(columnIndex)}
                          disabled={stats.selected === 0}
                          className="gap-2"
                        >
                          <Folder className="h-3 w-3" />
                          Export Column ({stats.selected})
                        </Button>
                      )}
                    </div>

                    {/* Banners Grid */}
                    <div className="grid grid-cols-4 gap-3 pl-9">
                      {banners.map((banner) => (
                        <BannerPreviewCard
                          key={banner.id}
                          banner={banner}
                          isSelected={selectedBanners.has(banner.id)}
                          onToggle={() => toggleBanner(banner.id)}
                          thumbnail={prerenderedThumbnails.get(banner.id) || null}
                          isLoading={false}
                          disabled={isExporting}
                          scale={settings.scale}
                          format={settings.format}
                          exportState={
                            completedBannerIds.has(banner.id)
                              ? 'done'
                              : exportProgress?.currentBannerId === banner.id && isExporting
                                ? 'exporting'
                                : isExporting
                                  ? 'pending'
                                  : 'idle'
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {allBanners.map((banner) => (
                <BannerPreviewCard
                  key={banner.id}
                  banner={banner}
                  isSelected={selectedBanners.has(banner.id)}
                  onToggle={() => toggleBanner(banner.id)}
                  thumbnail={prerenderedThumbnails.get(banner.id) || null}
                  isLoading={false}
                  disabled={isExporting}
                  scale={settings.scale}
                  format={settings.format}
                  exportState={
                    completedBannerIds.has(banner.id)
                      ? 'done'
                      : exportProgress?.currentBannerId === banner.id && isExporting
                        ? 'exporting'
                        : isExporting
                          ? 'pending'
                          : 'idle'
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Export Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            {isExporting ? (
              <span className="text-blue-600 font-medium">Exporting in progress...</span>
            ) : isDone ? (
              <span className="text-green-600 font-medium">Export complete!</span>
            ) : selectedBanners.size === 0 ? (
              <span className="text-orange-600 font-medium">No banners selected</span>
            ) : selectedBanners.size === allBanners.length ? (
              <span>All banners will be exported as a ZIP file</span>
            ) : selectedBanners.size === 1 ? (
              <span>1 banner will be exported as {settings.format.toUpperCase()}</span>
            ) : (
              <span>{selectedBanners.size} banners will be exported as ZIP</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isExporting && !isDone && (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={selectedBanners.size === 0}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Export {selectedBanners.size > 0 && `(${selectedBanners.size})`}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BannerPreviewCardProps {
  banner: { id: string; format: BannerFormat };
  isSelected: boolean;
  onToggle: () => void;
  thumbnail: string | null;
  isLoading: boolean;
  disabled?: boolean;
  scale?: number;
  format?: string;
  exportState?: 'idle' | 'pending' | 'exporting' | 'done';
}

function BannerPreviewCard({
  banner,
  isSelected,
  onToggle,
  thumbnail,
  isLoading,
  disabled = false,
  scale = 2,
  format = 'png',
  exportState = 'idle',
}: BannerPreviewCardProps) {
  const outputWidth = banner.format.width * scale;
  const outputHeight = banner.format.height * scale;

  return (
    <div
      onClick={disabled ? undefined : onToggle}
      className={`group relative rounded-lg border-2 transition-all overflow-hidden ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50 cursor-pointer'
            : 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
      }`}
    >
      {/* Preview: a fixed-height box for every format, with the banner
          letterboxed inside it. Sizing the card from the banner's own aspect
          ratio made tall formats (a 120x600 skyscraper) taller than the modal
          and pushed the export button out of reach. object-contain also shows
          the whole banner — object-cover used to crop the preview. */}
      <div className="relative h-28 bg-gray-100 flex items-center justify-center p-2">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={banner.format.name}
            className="max-h-full max-w-full object-contain shadow-sm"
            style={{ aspectRatio: `${banner.format.width} / ${banner.format.height}` }}
          />
        ) : (
          <div
            className="max-h-full max-w-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-sm"
            style={{
              aspectRatio: `${banner.format.width} / ${banner.format.height}`,
              height: '100%',
            }}
          />
        )}

        {/* Selection Indicator */}
        <div className="absolute top-1.5 right-1.5 z-10">
          {isSelected ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 fill-white" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Info — always visible so the set can be reviewed at a glance */}
      <div className="bg-white p-2 border-t">
        <h4 className="font-medium text-xs mb-0.5 truncate">{banner.format.name}</h4>
        <p className="text-[11px] text-gray-500">
          {banner.format.width} x {banner.format.height}
        </p>
        {/* Wraps: at four columns the row is too narrow for both badges side
            by side, and the format badge used to be clipped. */}
        <div className="flex flex-wrap items-center gap-1 mt-1">
          <Badge variant="secondary" className="text-[10px]">
            {outputWidth}x{outputHeight}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase">
            {format}
          </Badge>
        </div>
      </div>

      {/* Export State Indicator */}
      {exportState !== 'idle' && (
        <div className="absolute top-2 left-2 z-10">
          {exportState === 'exporting' ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : exportState === 'pending' ? (
            <Circle className="h-5 w-5 text-gray-400" />
          ) : exportState === 'done' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : null}
        </div>
      )}
    </div>
  );
}
