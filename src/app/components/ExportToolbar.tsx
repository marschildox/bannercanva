import { useState, useEffect, lazy, Suspense } from 'react';
import { Button } from './ui/button';
import { Image, Eye, Loader2, CheckCircle2 } from 'lucide-react';
import { useBannerExport } from '../hooks/useBannerExport';
import { BannerFormat } from '../types/banner';
import type { ExportSettings } from './ExportPreviewDialog';
import { toast } from 'sonner';

// Loaded on demand: the preview dialog (and its thumbnail pipeline) is only
// needed once the user opens the export flow.
const ExportPreviewDialog = lazy(() =>
  import('./ExportPreviewDialog').then((m) => ({ default: m.ExportPreviewDialog })),
);

interface ExportToolbarProps {
  selectedBanner: { id: string; format: BannerFormat } | null;
  columnBanners: Array<Array<{ id: string; format: BannerFormat }>>;
  allBanners: Array<{ id: string; format: BannerFormat }>;
  columnNames: string[];
  prerenderedThumbnails?: Map<string, string>;
}

export function ExportToolbar({
  selectedBanner,
  columnBanners,
  allBanners,
  columnNames,
  prerenderedThumbnails = new Map(),
}: ExportToolbarProps) {
  const [showPreview, setShowPreview] = useState(false);

  const {
    exportAndDownload,
    exportColumn,
    exportAllBanners,
    cancelExport,
    resetProgress,
    progress,
    completedBannerIds,
  } = useBannerExport();

  const isExporting = progress.status === 'exporting';
  const isDone = progress.status === 'done';

  // Toast on completion
  useEffect(() => {
    if (isDone && progress.total > 0) {
      toast.success(
        `Exported ${progress.total} banner${progress.total !== 1 ? 's' : ''} successfully!`,
        {
          duration: 3000,
        },
      );
      const timer = setTimeout(resetProgress, 3000);
      return () => clearTimeout(timer);
    }
  }, [isDone, progress.total, resetProgress]);

  // Toast on error
  useEffect(() => {
    if (progress.status === 'error') {
      toast.error('Export failed. Please try again.', { duration: 4000 });
      const timer = setTimeout(resetProgress, 4000);
      return () => clearTimeout(timer);
    }
  }, [progress.status, resetProgress]);

  const handleQuickExport = async () => {
    if (!selectedBanner) return;
    const success = await exportAndDownload(selectedBanner.id, selectedBanner.format, {
      format: 'png',
      quality: 1,
      scale: 2,
    });
    if (success) {
      toast.success(`Exported ${selectedBanner.format.name}`, { duration: 2000 });
    }
  };

  const handleExportSelected = async (bannerIds: string[], settings: ExportSettings) => {
    const bannersToExport = allBanners.filter((b) => bannerIds.includes(b.id));
    await exportAllBanners(bannersToExport, 'selected_banners', {
      format: settings.format,
      quality: settings.quality,
      scale: settings.scale,
    });
  };

  const handleExportColumnFromPreview = async (
    columnIndex: number,
    bannerIds: string[],
    settings: ExportSettings,
  ) => {
    const bannersToExport = columnBanners[columnIndex].filter((b) => bannerIds.includes(b.id));
    await exportColumn(bannersToExport, columnNames[columnIndex], {
      format: settings.format,
      quality: settings.quality,
      scale: settings.scale,
    });
  };

  const handleExportAllFromPreview = async (bannerIds: string[], settings: ExportSettings) => {
    const bannersToExport = allBanners.filter((b) => bannerIds.includes(b.id));
    await exportAllBanners(bannersToExport, 'banner_set', {
      format: settings.format,
      quality: settings.quality,
      scale: settings.scale,
    });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Export Status (inline for quick export) */}
      {isExporting && !showPreview && (
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          <span className="text-xs text-blue-700 font-medium">
            {progress.current}/{progress.total}
          </span>
        </div>
      )}

      {/* Done indicator */}
      {isDone && !showPreview && (
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-xs text-green-700 font-medium">Done!</span>
        </div>
      )}

      {/* Quick Export Selected Banner */}
      {selectedBanner && !isExporting && (
        <Button variant="outline" size="sm" onClick={handleQuickExport} className="gap-2">
          <Image className="h-4 w-4" />
          Quick Export
        </Button>
      )}

      {/* Main Export Button - Opens Preview */}
      {allBanners.length > 0 && !isExporting && (
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowPreview(true)}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <Eye className="h-4 w-4" />
          Export Preview ({allBanners.length})
        </Button>
      )}

      {/* Export Preview Dialog (lazy — mounted on first open) */}
      {showPreview && (
        <Suspense fallback={null}>
          <ExportPreviewDialog
            open={showPreview}
            onOpenChange={setShowPreview}
            allBanners={allBanners}
            columnBanners={columnBanners}
            columnNames={columnNames}
            onExportSelected={handleExportSelected}
            onExportColumn={handleExportColumnFromPreview}
            onExportAll={handleExportAllFromPreview}
            onCancelExport={cancelExport}
            prerenderedThumbnails={prerenderedThumbnails}
            exportProgress={progress}
            completedBannerIds={completedBannerIds}
          />
        </Suspense>
      )}
    </div>
  );
}
