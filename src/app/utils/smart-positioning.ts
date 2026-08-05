import {
  BannerContent,
  BannerFormat,
  TextElement,
  ShapeElement,
  ImageElement,
  CTA,
} from '../types/banner';

// ═══════════════════════════════════════════════════════════════════════════════
// SMART POSITIONING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
// Computes optimal positions and sizes for all banner elements relative to
// the target format dimensions. Uses a zone-based layout system that adapts
// to different aspect ratios.
//
// Layout strategies:
//   STACKED     (0.35 ≤ ratio ≤ 3.0)  → vertical zones: logo top, text center, CTA bottom
//   HORIZONTAL  (ratio > 3.0)          → horizontal zones: logo left, text center, CTA right
//   COMPRESSED  (ratio < 0.35)         → tight vertical stack with aggressive sizing
// ═══════════════════════════════════════════════════════════════════════════════

type LayoutMode = 'stacked' | 'horizontal' | 'compressed';

function getLayoutMode(ratio: number): LayoutMode {
  if (ratio > 3.0) return 'horizontal';
  if (ratio < 0.35) return 'compressed';
  return 'stacked';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Replicate BannerCanvas's baseFontSize formula */
function getBaseFontSize(format: BannerFormat): number {
  return Math.min(format.width, format.height) * 0.08;
}

/**
 * Estimate the rendered width of a text string at a given font size.
 * Uses a rough char-width heuristic (~0.55 * fontSize per character).
 */
function estimateTextWidth(text: string, fontSize: number, fontWeight?: string): number {
  const charWidthFactor = fontWeight === 'bold' || fontWeight === 'semibold' ? 0.6 : 0.55;
  return Math.ceil(text.length * fontSize * charWidthFactor);
}

/**
 * Estimate rendered height of a text line including line-height.
 */
/**
 * Estimate how tall a text block renders once wrapping is taken into account.
 *
 * Reserving one line's worth of height is what made a wrapped headline collide
 * with the text stacked below it — long copy in a narrow format (a Story, a
 * skyscraper) wraps to two or three lines.
 */
function estimateBlockHeight(
  text: string,
  fontSize: number,
  lineHeight: number,
  paddingY: number,
  availableWidth: number,
  fontWeight?: string,
): number {
  const lines =
    availableWidth > 0
      ? Math.max(1, Math.ceil(estimateTextWidth(text, fontSize, fontWeight) / availableWidth))
      : 1;
  return lines * estimateTextHeight(fontSize, lineHeight) + paddingY * 2;
}

function estimateTextHeight(fontSize: number, lineHeight: number = 1.2): number {
  return Math.ceil(fontSize * lineHeight);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function computeSmartLayout(content: BannerContent, format: BannerFormat): BannerContent {
  const W = format.width;
  const H = format.height;
  const ratio = W / H;
  const minDim = Math.min(W, H);
  const baseFontSize = getBaseFontSize(format);
  const mode = getLayoutMode(ratio);

  // Margins (percentage of minDim, with absolute floor)
  const marginPct = mode === 'compressed' ? 0.04 : mode === 'horizontal' ? 0.06 : 0.05;
  const margin = Math.max(4, Math.round(minDim * marginPct));

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoResult = positionLogo(content, format, mode, margin, baseFontSize);

  // ── Texts ─────────────────────────────────────────────────────────────────
  const textsResult = positionTexts(content, format, mode, margin, baseFontSize, logoResult);

  // ── CTAs ──────────────────────────────────────────────────────────────────
  const ctaResult = positionCtaGroup(content, format, mode, margin, baseFontSize, textsResult);

  // ── Shapes ────────────────────────────────────────────────────────────────
  const shapesResult = positionShapes(content, format, mode, margin);

  // ── Images ────────────────────────────────────────────────────────────────
  const imagesResult = positionImages(content, format, mode, margin);

  return {
    ...content,
    // Logo positioning
    logoX: logoResult.x,
    logoY: logoResult.y,
    logoWidth: logoResult.width,
    logoHeight: logoResult.height,
    logoRotation: content.logoRotation || 0,
    // Texts
    texts: textsResult.texts,
    // CTAs
    ctaGroupX: ctaResult.x,
    ctaGroupY: ctaResult.y,
    ctas: ctaResult.ctas,
    // Shapes
    shapes: shapesResult,
    // Images
    images: imagesResult,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGO POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════

interface LogoResult {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The bottom Y edge of the logo area (for spacing subsequent elements) */
  bottomY: number;
  /** The right X edge of the logo area (for horizontal layouts) */
  rightX: number;
}

function positionLogo(
  content: BannerContent,
  format: BannerFormat,
  mode: LayoutMode,
  margin: number,
  baseFontSize: number,
): LogoResult {
  const W = format.width;
  const H = format.height;

  if (!content.logo) {
    return { x: margin, y: margin, width: 0, height: 0, bottomY: margin, rightX: margin };
  }

  const logoSizeFactor = content.logoSize / 100;

  switch (mode) {
    case 'horizontal': {
      // Logo on the left side, vertically centered
      const logoH = clamp(Math.round(H * 0.6 * logoSizeFactor), 20, H - margin * 2);
      const logoW = logoH; // square
      const x = margin;
      const y = Math.round((H - logoH) / 2);
      return { x, y, width: logoW, height: logoH, bottomY: y + logoH, rightX: x + logoW + margin };
    }
    case 'compressed': {
      // Small logo at the top, centered horizontally
      const logoH = clamp(Math.round(H * 0.08 * logoSizeFactor), 16, Math.round(H * 0.15));
      const logoW = logoH;
      const x = Math.round((W - logoW) / 2);
      const y = margin;
      return {
        x,
        y,
        width: logoW,
        height: logoH,
        bottomY: y + logoH + Math.round(margin * 0.5),
        rightX: x + logoW,
      };
    }
    default: {
      // stacked
      // Logo in top-left area, proportional to min dimension
      const targetSize = Math.round(baseFontSize * 3 * logoSizeFactor);
      const logoH = clamp(targetSize, 20, Math.round(Math.min(W, H) * 0.25));
      const logoW = logoH;
      const x = margin;
      const y = margin;
      return {
        x,
        y,
        width: logoW,
        height: logoH,
        bottomY: y + logoH + margin,
        rightX: x + logoW + margin,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════

interface TextsResult {
  texts: TextElement[];
  /** The bottom Y edge of the last text (for positioning CTAs) */
  bottomY: number;
  /** The right X edge of text area (for horizontal layouts) */
  rightX: number;
}

function positionTexts(
  content: BannerContent,
  format: BannerFormat,
  mode: LayoutMode,
  margin: number,
  baseFontSize: number,
  logoResult: LogoResult,
): TextsResult {
  const W = format.width;
  const H = format.height;
  const texts = content.texts || [];

  if (texts.length === 0) {
    return { texts: [], bottomY: logoResult.bottomY, rightX: logoResult.rightX };
  }

  const newTexts: TextElement[] = [];
  let currentY = 0;

  switch (mode) {
    case 'horizontal': {
      // Texts in the center zone
      const textZoneLeft = logoResult.rightX;
      const textZoneWidth = Math.round(W * 0.55);
      const textZoneRight = textZoneLeft + textZoneWidth;

      // Calculate total text height first
      let totalTextH = 0;
      const textHeights: number[] = [];
      texts.forEach((t) => {
        const fontSize = Math.round(baseFontSize * (t.fontSize / 100));
        const lineH = (t.lineHeight || 120) / 100;
        const paddingY = t.paddingY || 8;
        const paddingX = t.paddingX || 16;
        const h = estimateBlockHeight(
          t.text,
          fontSize,
          lineH,
          paddingY,
          textZoneWidth - paddingX * 2,
          t.fontWeight,
        );
        textHeights.push(h);
        totalTextH += h;
      });
      totalTextH += (texts.length - 1) * Math.round(margin * 0.5);

      // Center texts vertically in the banner
      currentY = Math.max(margin, Math.round((H - totalTextH) / 2));

      texts.forEach((t, i) => {
        const bgStyle = t.bgStyle || 'full-width';
        const fontSize = Math.round(baseFontSize * (t.fontSize / 100));
        const paddingX = t.paddingX || 16;
        const estWidth = estimateTextWidth(t.text, fontSize, t.fontWeight) + paddingX * 2;
        const isFullWidth = !t.width && bgStyle !== 'inline';
        const textW = isFullWidth ? textZoneWidth : Math.min(estWidth, textZoneWidth);

        const x = isFullWidth
          ? textZoneLeft
          : Math.round(textZoneLeft + (textZoneWidth - textW) / 2);

        newTexts.push({
          ...t,
          x,
          y: currentY,
          width: isFullWidth ? textZoneWidth : undefined,
        });
        currentY += textHeights[i] + Math.round(margin * 0.5);
      });

      return { texts: newTexts, bottomY: currentY, rightX: textZoneRight };
    }

    case 'compressed': {
      // Tight vertical stacking, centered
      let totalTextH = 0;
      const textHeights: number[] = [];
      texts.forEach((t) => {
        const fontSize = Math.round(baseFontSize * (t.fontSize / 100));
        const lineH = (t.lineHeight || 120) / 100;
        const paddingY = t.paddingY || 8;
        const paddingX = t.paddingX || 16;
        const h = estimateBlockHeight(
          t.text,
          fontSize,
          lineH,
          paddingY,
          W - paddingX * 2,
          t.fontWeight,
        );
        textHeights.push(h);
        totalTextH += h;
      });
      const gap = Math.round(margin * 0.3);
      totalTextH += (texts.length - 1) * gap;

      // Position texts in the middle 60% of height (after logo, before CTA)
      const availableTop = logoResult.bottomY;
      const availableBottom = H - margin - Math.round(H * 0.15); // reserve 15% for CTAs
      const availableH = availableBottom - availableTop;
      currentY = Math.round(availableTop + Math.max(0, (availableH - totalTextH) / 2));

      texts.forEach((t, i) => {
        const bgStyle = t.bgStyle || 'full-width';
        const isFullWidth = !t.width && bgStyle !== 'inline';
        const x = isFullWidth ? 0 : Math.round(W * 0.05);

        newTexts.push({
          ...t,
          x,
          y: currentY,
          width: isFullWidth ? W : Math.min(t.width || W, W - Math.round(W * 0.1)),
        });
        currentY += textHeights[i] + gap;
      });

      return { texts: newTexts, bottomY: currentY, rightX: W };
    }

    default: {
      // stacked
      // Vertical stacking: texts centered in the middle zone
      let totalTextH = 0;
      const textHeights: number[] = [];
      texts.forEach((t) => {
        const fontSize = Math.round(baseFontSize * (t.fontSize / 100));
        const lineH = (t.lineHeight || 120) / 100;
        const paddingY = t.paddingY || 8;
        const paddingX = t.paddingX || 16;
        const h = estimateBlockHeight(
          t.text,
          fontSize,
          lineH,
          paddingY,
          W - paddingX * 2,
          t.fontWeight,
        );
        textHeights.push(h);
        totalTextH += h;
      });
      const gap = Math.round(margin * 0.5);
      totalTextH += (texts.length - 1) * gap;

      // Available zone between logo bottom and CTA area
      const availableTop = logoResult.bottomY;
      const ctaReserve = Math.round(H * 0.2); // reserve ~20% for CTAs
      const availableBottom = H - margin - ctaReserve;
      const availableH = Math.max(0, availableBottom - availableTop);
      currentY = Math.round(availableTop + Math.max(0, (availableH - totalTextH) / 2));

      texts.forEach((t, i) => {
        const bgStyle = t.bgStyle || 'full-width';
        const isFullWidth = !t.width && bgStyle !== 'inline';
        const fontSize = Math.round(baseFontSize * (t.fontSize / 100));
        const paddingX = t.paddingX || 16;
        const estWidth = estimateTextWidth(t.text, fontSize, t.fontWeight) + paddingX * 2;

        const x = isFullWidth ? 0 : Math.round((W - Math.min(estWidth, W - margin * 2)) / 2);
        const w = isFullWidth ? W : undefined;

        newTexts.push({
          ...t,
          x,
          y: currentY,
          width: w,
        });
        currentY += textHeights[i] + gap;
      });

      return { texts: newTexts, bottomY: currentY, rightX: W };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CTA GROUP POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════

interface CtaResult {
  x: number;
  y: number;
  ctas: CTA[];
}

function positionCtaGroup(
  content: BannerContent,
  format: BannerFormat,
  mode: LayoutMode,
  margin: number,
  baseFontSize: number,
  textsResult: TextsResult,
): CtaResult {
  const W = format.width;
  const H = format.height;
  const ctas = content.ctas || [];

  if (ctas.length === 0) {
    return { x: 0, y: 0, ctas: [] };
  }

  // Calculate total CTA block dimensions
  const ctaGap = Math.round(baseFontSize * 0.4);
  let totalCtaH = 0;
  let maxCtaW = 0;

  ctas.forEach((cta, i) => {
    const fs = Math.round(
      baseFontSize * 0.9 * (content.ctaSize / 100) * ((cta.fontSize || 100) / 100),
    );
    const py = Math.round(fs * 0.5);
    const px = Math.round(fs * 1.5);
    const ctaH = Math.ceil(fs * 1.2) + py * 2;
    const ctaW = estimateTextWidth(cta.text, fs) + px * 2;
    totalCtaH += ctaH;
    if (i < ctas.length - 1) totalCtaH += ctaGap;
    maxCtaW = Math.max(maxCtaW, ctaW);
  });

  switch (mode) {
    case 'horizontal': {
      // CTAs on the right side, vertically centered
      const ctaX = Math.round(W - margin - maxCtaW);
      const ctaY = Math.round((H - totalCtaH) / 2);
      return { x: Math.max(ctaX, textsResult.rightX + margin), y: Math.max(margin, ctaY), ctas };
    }
    case 'compressed': {
      // CTAs at the bottom, centered
      const ctaX = Math.round((W - maxCtaW) / 2);
      const ctaY = Math.round(H - margin - totalCtaH);
      return { x: Math.max(0, ctaX), y: Math.max(textsResult.bottomY, ctaY), ctas };
    }
    default: {
      // stacked
      // CTAs below the texts, centered horizontally
      const ctaX = Math.round((W - maxCtaW) / 2);
      // Position after texts with some spacing, but not beyond the bottom margin
      const desiredY = textsResult.bottomY + margin;
      const maxY = H - margin - totalCtaH;
      const ctaY = Math.round(clamp(desiredY, margin, Math.max(margin, maxY)));
      return { x: Math.max(0, ctaX), y: ctaY, ctas };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHAPE POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════

function positionShapes(
  content: BannerContent,
  format: BannerFormat,
  mode: LayoutMode,
  margin: number,
): ShapeElement[] {
  const shapes = content.shapes || [];
  if (shapes.length === 0) return [];

  const W = format.width;
  const H = format.height;

  return shapes.map((shape) => {
    // ── Background shapes fill the entire banner ──
    if (shape.isBackground) {
      return {
        ...shape,
        x: 0,
        y: 0,
        width: W,
        height: H,
        rotation: 0,
      };
    }

    const origX = shape.x || 0;
    const origY = shape.y || 0;
    const origW = shape.width || 100;
    const origH = shape.height || 100;

    // Scale factor: use the smaller of width or height ratios,
    // normalized to a 1000px reference canvas
    const refSize = 1000;
    const scaleFactor = Math.min(W, H) / refSize;

    const newW = clamp(Math.round(origW * scaleFactor), 10, W - margin * 2);
    const newH = clamp(Math.round(origH * scaleFactor), 10, H - margin * 2);

    const xRatio = origX / refSize;
    const yRatio = origY / refSize;
    const newX = clamp(Math.round(xRatio * W), 0, W - newW);
    const newY = clamp(Math.round(yRatio * H), 0, H - newH);

    return {
      ...shape,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════

function positionImages(
  content: BannerContent,
  format: BannerFormat,
  mode: LayoutMode,
  margin: number,
): ImageElement[] {
  const images = content.images || [];
  if (images.length === 0) return [];

  const W = format.width;
  const H = format.height;

  return images.map((image) => {
    // ── Background images fill the entire banner ──
    if (image.isBackground) {
      return {
        ...image,
        x: 0,
        y: 0,
        width: W,
        height: H,
        rotation: 0,
      };
    }

    const origX = image.x || 0;
    const origY = image.y || 0;
    const origW = image.width || 100;
    const origH = image.height || 100;

    const refSize = 1000;
    const scaleFactor = Math.min(W, H) / refSize;

    const newW = clamp(Math.round(origW * scaleFactor), 10, W - margin * 2);
    const newH = clamp(Math.round(origH * scaleFactor), 10, H - margin * 2);

    const xRatio = origX / refSize;
    const yRatio = origY / refSize;
    const newX = clamp(Math.round(xRatio * W), 0, W - newW);
    const newY = clamp(Math.round(yRatio * H), 0, H - newH);

    return {
      ...image,
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE-BASED SMART POSITIONING
// ═══════════════════════════════════════════════════════════════════════════════
// When we know the reference format (e.g. the Super Master), we can scale
// relative positions proportionally to the target format.

export function computeSmartLayoutFromReference(
  content: BannerContent,
  targetFormat: BannerFormat,
  referenceFormat: BannerFormat,
): BannerContent {
  const refW = referenceFormat.width;
  const refH = referenceFormat.height;
  const tgtW = targetFormat.width;
  const tgtH = targetFormat.height;

  // If aspect ratios are very different, use the zone-based algorithm
  const refRatio = refW / refH;
  const tgtRatio = tgtW / tgtH;
  const ratioDifference = Math.abs(refRatio - tgtRatio) / Math.max(refRatio, tgtRatio);

  if (ratioDifference > 0.5) {
    // Aspect ratios are too different — use the zone-based smart layout
    return computeSmartLayout(content, targetFormat);
  }

  // Aspect ratios are similar enough — use proportional scaling
  const scaleX = tgtW / refW;
  const scaleY = tgtH / refH;

  // Logo
  const logoX = content.logoX !== undefined ? Math.round(content.logoX * scaleX) : undefined;
  const logoY = content.logoY !== undefined ? Math.round(content.logoY * scaleY) : undefined;
  const logoWidth =
    content.logoWidth !== undefined
      ? Math.round(content.logoWidth * Math.min(scaleX, scaleY))
      : undefined;
  const logoHeight =
    content.logoHeight !== undefined
      ? Math.round(content.logoHeight * Math.min(scaleX, scaleY))
      : undefined;

  // Texts
  const texts = (content.texts || []).map((t) => ({
    ...t,
    x: t.x !== undefined ? Math.round(t.x * scaleX) : undefined,
    y: t.y !== undefined ? Math.round(t.y * scaleY) : undefined,
    width: t.width !== undefined ? Math.round(t.width * scaleX) : undefined,
    height: t.height !== undefined ? Math.round(t.height * scaleY) : undefined,
  }));

  // CTA Group
  const ctaGroupX =
    content.ctaGroupX !== undefined ? Math.round(content.ctaGroupX * scaleX) : undefined;
  const ctaGroupY =
    content.ctaGroupY !== undefined ? Math.round(content.ctaGroupY * scaleY) : undefined;

  // Shapes
  const shapes = (content.shapes || []).map((s) => ({
    ...s,
    // Background shapes fill the entire target canvas
    ...(s.isBackground
      ? { x: 0, y: 0, width: tgtW, height: tgtH, rotation: 0 }
      : {
          x: s.x !== undefined ? Math.round(s.x * scaleX) : undefined,
          y: s.y !== undefined ? Math.round(s.y * scaleY) : undefined,
          width: s.width !== undefined ? Math.round(s.width * Math.min(scaleX, scaleY)) : undefined,
          height:
            s.height !== undefined ? Math.round(s.height * Math.min(scaleX, scaleY)) : undefined,
        }),
  }));

  // Images
  const images = (content.images || []).map((img) => ({
    ...img,
    // Background images fill the entire target canvas
    ...(img.isBackground
      ? { x: 0, y: 0, width: tgtW, height: tgtH, rotation: 0 }
      : {
          x: Math.round(img.x * scaleX),
          y: Math.round(img.y * scaleY),
          width: Math.round(img.width * Math.min(scaleX, scaleY)),
          height: Math.round(img.height * Math.min(scaleX, scaleY)),
        }),
  }));

  return {
    ...content,
    logoX,
    logoY,
    logoWidth,
    logoHeight,
    texts,
    ctaGroupX,
    ctaGroupY,
    shapes,
    images,
  };
}
