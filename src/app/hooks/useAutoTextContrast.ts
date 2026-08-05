import { useEffect, useRef } from 'react';
import { BannerContent, BannerFormat, TextElement } from '../types/banner';
import { computeTextContrastUpdates } from '../utils/text-contrast';

/**
 * Watches banner contents and automatically adapts text color/weight/size to
 * keep good contrast against whatever background sits under each text.
 *
 * Runs debounced after every content change. The patch callback must NOT
 * propagate master→child (each banner samples its own background crop) and
 * must be a no-op when nothing actually changes, which ends the cycle:
 * compute → patch → recompute → no changes → stop.
 */
export function useAutoTextContrast(
  banners: Array<{ id: string; format: BannerFormat }>,
  bannerContents: Map<string, BannerContent>,
  patchTextStyles: (formatId: string, updates: Map<string, Partial<TextElement>>) => void,
  debounceMs: number = 400,
) {
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;

    const timer = setTimeout(async () => {
      for (const banner of banners) {
        if (generationRef.current !== generation) return; // superseded
        const content = bannerContents.get(banner.id);
        if (!content || content.texts.length === 0) continue;

        try {
          const updates = await computeTextContrastUpdates(content, banner.format);
          if (updates.size > 0 && generationRef.current === generation) {
            patchTextStyles(banner.id, updates);
          }
        } catch {
          // Sampling can fail (image blocked, CORS). Never break the app for it.
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [banners, bannerContents, patchTextStyles, debounceMs]);
}
