import { useEffect, useRef, useCallback } from 'react';
import { BannerFormat } from '../types/banner';
import { captureElement } from '../utils/export-helpers';

/**
 * Hook that automatically generates and updates thumbnails for all banners
 * using the same off-screen clone strategy as the full export pipeline.
 *
 * Uses debounce to avoid regenerating on every keystroke.
 * Thumbnails are captured at low scale (0.3) for performance.
 *
 * Handles the race condition where content changes during generation:
 * after a generation pass completes, if `pendingRef` is true (meaning
 * content changed while we were generating), we schedule another pass.
 */
export function useAutoThumbnails(
  banners: Array<{ id: string; format: BannerFormat }>,
  bannerContents: Map<string, any>,
  updateThumbnail: (formatId: string, dataUrl: string) => void,
  debounceMs: number = 1000,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingRef = useRef(false);
  const pendingRef = useRef(false);
  const generationIdRef = useRef(0);

  const generate = useCallback(async () => {
    if (banners.length === 0) return;

    isGeneratingRef.current = true;
    pendingRef.current = false;
    const genId = ++generationIdRef.current;

    for (const banner of banners) {
      // Bail out if a newer generation was requested
      if (generationIdRef.current !== genId) break;

      const dataUrl = await captureElement(banner.id, banner.format.width, banner.format.height, {
        scale: 0.3, // Low res for thumbnails
        format: 'png',
        quality: 0.7,
        forThumbnail: true,
        returnType: 'dataUrl',
      });

      if (dataUrl && generationIdRef.current === genId) {
        updateThumbnail(banner.format.id, dataUrl);
      }

      // Small delay between captures to avoid blocking UI
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    isGeneratingRef.current = false;

    // If content changed while we were generating, schedule another pass
    if (pendingRef.current) {
      pendingRef.current = false;
      timeoutRef.current = setTimeout(generate, debounceMs);
    }
  }, [banners, updateThumbnail, debounceMs]);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isGeneratingRef.current) {
      // Mark that content changed while generating — will re-run after current pass
      pendingRef.current = true;
      return;
    }

    // Debounce thumbnail generation
    timeoutRef.current = setTimeout(generate, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [banners, bannerContents, generate, debounceMs]);
}
