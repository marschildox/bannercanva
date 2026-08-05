import { useCallback, useRef, useState } from 'react';
import { BannerFormat } from '../types/banner';
import { captureElement } from '../utils/export-helpers';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ExportOptions {
  format?: 'png' | 'jpg' | 'webp';
  quality?: number; // 0–1
  scale?: number; // 1, 2, 3
}

export interface ExportProgress {
  current: number;
  total: number;
  currentName: string;
  currentBannerId: string;
  status: 'idle' | 'exporting' | 'done' | 'error';
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  bannerId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBannerExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    current: 0,
    total: 0,
    currentName: '',
    currentBannerId: '',
    status: 'idle',
  });
  const [completedBannerIds, setCompletedBannerIds] = useState<Set<string>>(new Set());
  const cancelRef = useRef(false);

  // ── Cancel running export ────────────────────────────────────────────
  const cancelExport = useCallback(() => {
    cancelRef.current = true;
  }, []);

  // ── Export a single banner to Blob ───────────────────────────────────
  const exportSingleBanner = useCallback(
    async (
      bannerId: string,
      formatInfo: BannerFormat,
      options: ExportOptions = {},
    ): Promise<Blob | null> => {
      const { format = 'png', quality = 0.95, scale = 2 } = options;

      return captureElement(bannerId, formatInfo.width, formatInfo.height, {
        scale,
        format,
        quality,
        returnType: 'blob',
      });
    },
    [],
  );

  // ── Build filename helper ────────────────────────────────────────────
  const buildFilename = (formatInfo: BannerFormat, format: string = 'png') =>
    `${formatInfo.name.replace(/\s+/g, '_')}_${formatInfo.width}x${formatInfo.height}.${format}`;

  // ── Download a Blob ──────────────────────────────────────────────────
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // ── Quick single download ────────────────────────────────────────────
  const exportAndDownload = useCallback(
    async (bannerId: string, formatInfo: BannerFormat, options: ExportOptions = {}) => {
      setCompletedBannerIds(new Set());
      setProgress({
        current: 0,
        total: 1,
        currentName: formatInfo.name,
        currentBannerId: bannerId,
        status: 'exporting',
      });

      const blob = await exportSingleBanner(bannerId, formatInfo, options);
      if (blob) {
        downloadBlob(blob, buildFilename(formatInfo, options.format || 'png'));
        setCompletedBannerIds(new Set([bannerId]));
        setProgress({
          current: 1,
          total: 1,
          currentName: formatInfo.name,
          currentBannerId: bannerId,
          status: 'done',
        });
        return true;
      }

      setProgress((p) => ({ ...p, status: 'error' }));
      return false;
    },
    [exportSingleBanner, downloadBlob],
  );

  // ── Batch export (with progress + cancel) ────────────────────────────
  const exportMultipleBanners = useCallback(
    async (
      banners: Array<{ id: string; format: BannerFormat }>,
      options: ExportOptions = {},
    ): Promise<ExportResult[]> => {
      cancelRef.current = false;
      setCompletedBannerIds(new Set());
      const results: ExportResult[] = [];
      const completed = new Set<string>();
      const total = banners.length;
      const format = options.format || 'png';

      setProgress({ current: 0, total, currentName: '', currentBannerId: '', status: 'exporting' });

      for (let i = 0; i < banners.length; i++) {
        if (cancelRef.current) break;

        const banner = banners[i];
        setProgress({
          current: i,
          total,
          currentName: banner.format.name,
          currentBannerId: banner.id,
          status: 'exporting',
        });

        const blob = await exportSingleBanner(banner.id, banner.format, options);
        if (blob) {
          results.push({
            blob,
            filename: buildFilename(banner.format, format),
            bannerId: banner.id,
          });
          completed.add(banner.id);
          setCompletedBannerIds(new Set(completed));
        }

        // Small delay between captures to avoid blocking UI
        if (i < banners.length - 1) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      setProgress({
        current: total,
        total,
        currentName: '',
        currentBannerId: '',
        status: cancelRef.current ? 'idle' : 'done',
      });

      return results;
    },
    [exportSingleBanner],
  );

  // ── ZIP helpers ──────────────────────────────────────────────────────
  const downloadAsZip = useCallback(
    async (exports: ExportResult[], zipName: string = 'banners.zip') => {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      exports.forEach(({ blob, filename }) => {
        zip.file(filename, blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, zipName);
    },
    [downloadBlob],
  );

  // ── Export a column as ZIP ───────────────────────────────────────────
  const exportColumn = useCallback(
    async (
      columnBanners: Array<{ id: string; format: BannerFormat }>,
      columnName: string,
      options: ExportOptions = {},
    ) => {
      const results = await exportMultipleBanners(columnBanners, options);
      if (results.length > 0) {
        if (results.length === 1) {
          downloadBlob(results[0].blob, results[0].filename);
        } else {
          await downloadAsZip(results, `${columnName}_banners.zip`);
        }
      }
      return results;
    },
    [exportMultipleBanners, downloadAsZip, downloadBlob],
  );

  // ── Export all banners as ZIP ────────────────────────────────────────
  const exportAllBanners = useCallback(
    async (
      allBanners: Array<{ id: string; format: BannerFormat }>,
      projectName: string = 'banner_set',
      options: ExportOptions = {},
    ) => {
      const results = await exportMultipleBanners(allBanners, options);
      if (results.length > 0) {
        if (results.length === 1) {
          downloadBlob(results[0].blob, results[0].filename);
        } else {
          await downloadAsZip(results, `${projectName}_complete_set.zip`);
        }
      }
      return results;
    },
    [exportMultipleBanners, downloadAsZip, downloadBlob],
  );

  // ── Reset progress ──────────────────────────────────────────────────
  const resetProgress = useCallback(() => {
    setProgress({ current: 0, total: 0, currentName: '', currentBannerId: '', status: 'idle' });
    setCompletedBannerIds(new Set());
  }, []);

  return {
    // Actions
    exportSingleBanner,
    exportAndDownload,
    exportMultipleBanners,
    exportColumn,
    exportAllBanners,
    downloadBlob,
    downloadAsZip,
    cancelExport,
    resetProgress,
    // State
    progress,
    completedBannerIds,
  };
}
