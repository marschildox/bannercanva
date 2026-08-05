import { BannerContent, BannerFormat, TextElement } from '../types/banner';
import { resolveElementRect } from './group-helpers';

// ═══════════════════════════════════════════════════════════════════════════
// AUTO TEXT CONTRAST
// Samples the composited background under each text element and adapts the
// text's color / weight / size so it stays readable (WCAG-based decisions).
// Pure decision logic is separated from canvas sampling so it can be tested.
// ═══════════════════════════════════════════════════════════════════════════

export interface RegionStats {
  /** Average WCAG relative luminance of the region, 0 (black) … 1 (white) */
  luminance: number;
  /** Standard deviation of luminance — high values mean a "busy" background */
  deviation: number;
}

// Colors the engine may assign. Dark is gray-900 (not pure black) for a
// softer look; both are checked and the one with the better ratio wins.
export const AUTO_LIGHT_COLOR = '#ffffff';
export const AUTO_DARK_COLOR = '#111827';

const WCAG_NORMAL_TEXT_RATIO = 4.5;
/** Rendered px at which WCAG considers text "large" (3:1 is then acceptable) */
const LARGE_TEXT_PX = 24;
/** Above this luminance deviation the background is considered busy/noisy */
const BUSY_DEVIATION = 0.22;

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
    };
  }
  if (/^[0-9a-f]{6}$/i.test(value)) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }
  return null;
}

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance from 8-bit RGB */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** WCAG contrast ratio between two luminances (1 … 21) */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LUM_LIGHT = relativeLuminance(255, 255, 255);
const darkRgb = hexToRgb(AUTO_DARK_COLOR)!;
const LUM_DARK = relativeLuminance(darkRgb.r, darkRgb.g, darkRgb.b);

const WEIGHT_ORDER = ['normal', 'medium', 'semibold', 'bold'] as const;

function atLeastWeight(
  current: TextElement['fontWeight'],
  min: (typeof WEIGHT_ORDER)[number],
): TextElement['fontWeight'] {
  const currentIndex = WEIGHT_ORDER.indexOf(current || 'normal');
  const minIndex = WEIGHT_ORDER.indexOf(min);
  return WEIGHT_ORDER[Math.max(currentIndex, minIndex)];
}

/**
 * Decide the style adjustments for a text given the sampled background stats.
 * Returns only the fields that need to change, or null when the text is fine.
 *
 * Rules:
 * 1. If the user's current color already reaches 4.5:1 on a calm background,
 *    it is kept (brand colors are respected while they work).
 * 2. Otherwise the engine picks white or dark gray — whichever contrasts more.
 * 3. Busy backgrounds get at least semibold weight.
 * 4. If even the best color stays under 4.5:1, the text is made "large"
 *    (bold + minimum rendered size of 24px) where 3:1 is acceptable.
 */
export function decideTextStyle(
  stats: RegionStats,
  text: TextElement,
  format: BannerFormat,
): Partial<TextElement> | null {
  const updates: Partial<TextElement> = {};

  const currentRgb = hexToRgb(text.color);
  const currentRatio = currentRgb
    ? contrastRatio(relativeLuminance(currentRgb.r, currentRgb.g, currentRgb.b), stats.luminance)
    : 0;

  const ratioLight = contrastRatio(LUM_LIGHT, stats.luminance);
  const ratioDark = contrastRatio(LUM_DARK, stats.luminance);
  const bestColor = ratioLight >= ratioDark ? AUTO_LIGHT_COLOR : AUTO_DARK_COLOR;
  const bestRatio = Math.max(ratioLight, ratioDark);

  let effectiveRatio = currentRatio;
  if (currentRatio < WCAG_NORMAL_TEXT_RATIO && bestRatio > currentRatio) {
    if (text.color.toLowerCase() !== bestColor) updates.color = bestColor;
    effectiveRatio = bestRatio;
  }

  const isBusy = stats.deviation > BUSY_DEVIATION;
  let minWeight: (typeof WEIGHT_ORDER)[number] | null = isBusy ? 'semibold' : null;

  if (effectiveRatio < WCAG_NORMAL_TEXT_RATIO) {
    // Even the best flat color can't reach 4.5:1 (mid-tone background):
    // fall back to WCAG "large text" (3:1) — bold and at least 24px rendered.
    minWeight = 'bold';
    const baseFontSize = Math.min(format.width, format.height) * 0.08;
    const minPercent = Math.ceil((LARGE_TEXT_PX / baseFontSize) * 100);
    if (text.fontSize < minPercent) {
      updates.fontSize = Math.min(200, minPercent); // 200 is the editor's slider cap
    }
  }

  if (minWeight) {
    const newWeight = atLeastWeight(text.fontWeight, minWeight);
    if (newWeight !== (text.fontWeight || 'normal')) updates.fontWeight = newWeight;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS SAMPLING (browser only)
// ═══════════════════════════════════════════════════════════════════════════

const SAMPLE_MAX_DIMENSION = 128;

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, cached);
  }
  return cached;
}

/** Draw an image with CSS `background-size: cover` semantics */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  verticalAlign: string,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  let dy = (h - dh) / 2;
  if (verticalAlign === 'top') dy = 0;
  if (verticalAlign === 'bottom') dy = h - dh;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Composite the banner's background layers (background image, shapes, extra
 * images — everything that renders under text) into a small offscreen canvas.
 * Returns null when sampling is impossible (e.g. CORS-tainted canvas).
 */
async function compositeBackground(
  content: BannerContent,
  format: BannerFormat,
): Promise<{ ctx: CanvasRenderingContext2D; scale: number } | null> {
  const scale = SAMPLE_MAX_DIMENSION / Math.max(format.width, format.height);
  const w = Math.max(1, Math.round(format.width * scale));
  const h = Math.max(1, Math.round(format.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Background image (cover, honoring vertical position)
  if (content.backgroundImage) {
    const img = await loadImage(content.backgroundImage);
    if (img) drawCover(ctx, img, w, h, content.backgroundPosition || 'center');
  }

  // Shapes & images in the same order BannerCanvas paints them:
  // background-layer ones first (stretched to the full canvas), then foreground.
  const shapes = content.shapes || [];
  const images = content.images || [];

  const drawShape = (s: (typeof shapes)[number], full: boolean) => {
    const rgb = hexToRgb(s.color);
    if (!rgb) return;
    ctx.globalAlpha = (s.opacity ?? 100) / 100;
    ctx.fillStyle = s.color;
    // Circles/triangles are approximated by their bounding box — good enough
    // for average-luminance sampling.
    if (full) ctx.fillRect(0, 0, w, h);
    else
      ctx.fillRect(
        (s.x || 0) * scale,
        (s.y || 0) * scale,
        (s.width || 100) * scale,
        (s.height || 100) * scale,
      );
    ctx.globalAlpha = 1;
  };

  const drawImageEl = async (i: (typeof images)[number], full: boolean) => {
    const img = await loadImage(i.src);
    if (!img) return;
    ctx.globalAlpha = (i.opacity ?? 100) / 100;
    if (full) drawCover(ctx, img, w, h, 'center');
    else ctx.drawImage(img, i.x * scale, i.y * scale, i.width * scale, i.height * scale);
    ctx.globalAlpha = 1;
  };

  for (const s of shapes.filter((s) => s.isBackground)) drawShape(s, true);
  for (const i of images.filter((i) => i.isBackground)) await drawImageEl(i, true);
  for (const s of shapes.filter((s) => !s.isBackground)) drawShape(s, false);
  for (const i of images.filter((i) => !i.isBackground)) await drawImageEl(i, false);

  return { ctx, scale };
}

function regionStats(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): RegionStats | null {
  const canvas = ctx.canvas;
  const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(w)));
  const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(h)));

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(sx, sy, sw, sh).data;
  } catch {
    // Canvas tainted by a non-CORS image — cannot sample.
    return null;
  }

  let sum = 0;
  let sumSq = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const lum = relativeLuminance(data[i], data[i + 1], data[i + 2]);
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return { luminance: mean, deviation: Math.sqrt(variance) };
}

/**
 * Compute style adjustments for every auto-contrast text in a banner.
 * Returns a map of textId → partial updates (empty map = nothing to change).
 */
export async function computeTextContrastUpdates(
  content: BannerContent,
  format: BannerFormat,
): Promise<Map<string, Partial<TextElement>>> {
  const updates = new Map<string, Partial<TextElement>>();

  const groupedIds = new Set((content.groups || []).flatMap((g) => g.memberIds));
  const candidates = content.texts.filter((t) => t.autoContrast !== false && !groupedIds.has(t.id));
  if (candidates.length === 0) return updates;

  const composited = await compositeBackground(content, format);
  if (!composited) return updates;
  const { ctx, scale } = composited;

  for (const text of candidates) {
    const rect = resolveElementRect(text.id, content, format);
    if (!rect) continue;
    const stats = regionStats(
      ctx,
      rect.x * scale,
      rect.y * scale,
      rect.width * scale,
      rect.height * scale,
    );
    if (!stats) continue;
    const decision = decideTextStyle(stats, text, format);
    if (decision) updates.set(text.id, decision);
  }

  return updates;
}
