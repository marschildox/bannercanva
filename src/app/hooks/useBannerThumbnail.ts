import { useState, useEffect, useCallback } from 'react';
import { BannerFormat } from '../types/banner';
import { captureElement } from '../utils/export-helpers';

/**
 * Hook for capturing a single banner thumbnail on demand.
 * Uses the shared off-screen clone strategy (same as full export).
 */
export function useBannerThumbnail(
  bannerId: string,
  format: BannerFormat,
  shouldCapture: boolean = false,
) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const captureThumbnail = useCallback(async () => {
    if (!shouldCapture) return;

    setIsLoading(true);

    const dataUrl = await captureElement(bannerId, format.width, format.height, {
      scale: 0.5,
      format: 'png',
      quality: 0.8,
      forThumbnail: true,
      returnType: 'dataUrl',
    });

    if (dataUrl) {
      setThumbnail(dataUrl);
    }

    setIsLoading(false);
  }, [bannerId, format, shouldCapture]);

  useEffect(() => {
    if (shouldCapture && !thumbnail) {
      captureThumbnail();
    }
  }, [shouldCapture, thumbnail, captureThumbnail]);

  return { thumbnail, isLoading, captureThumbnail };
}

/**
 * Hook for capturing multiple banner thumbnails.
 * Uses the shared off-screen clone strategy.
 */
export function useBannerThumbnails(
  banners: Array<{ id: string; format: BannerFormat }>,
  shouldCapture: boolean = false,
) {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const captureAllThumbnails = useCallback(async () => {
    if (!shouldCapture || banners.length === 0) return;

    setIsLoading(true);
    const newThumbnails = new Map<string, string>();

    for (const banner of banners) {
      const dataUrl = await captureElement(banner.id, banner.format.width, banner.format.height, {
        scale: 0.5,
        format: 'png',
        quality: 0.8,
        forThumbnail: true,
        returnType: 'dataUrl',
      });

      if (dataUrl) {
        newThumbnails.set(banner.id, dataUrl);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    setThumbnails(newThumbnails);
    setIsLoading(false);
  }, [banners, shouldCapture]);

  useEffect(() => {
    if (shouldCapture && thumbnails.size === 0) {
      const timer = setTimeout(() => {
        captureAllThumbnails();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldCapture, thumbnails.size, captureAllThumbnails]);

  return { thumbnails, isLoading, captureAllThumbnails };
}
