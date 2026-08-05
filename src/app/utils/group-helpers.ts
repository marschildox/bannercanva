// ═══════════════════════════════════════════════════════════════════════════════
// Group helpers
//
// Utilities for grouping / ungrouping elements.
// When grouping, absolute positions are converted to relative (to the group).
// When ungrouping, relative positions are converted back to absolute.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  BannerContent,
  BannerFormat,
  ElementGroup,
  TextElement,
  ShapeElement,
} from '../types/banner';

// ─── Resolve element positions ──────────────────────────────────────────────

interface ResolvedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Resolve the absolute position and size of any element on the canvas.
 * For texts/logo that use preset positions (no explicit x/y),
 * the fallback is computed from the format dimensions.
 */
export function resolveElementRect(
  elementId: string,
  content: BannerContent,
  format: BannerFormat,
): ResolvedRect | null {
  const baseFontSize = Math.min(format.width, format.height) * 0.08;
  const logoSize = baseFontSize * 3 * (content.logoSize / 100);

  // ── Logo ───────────────────────────────────────────────────────────────
  if (elementId === 'logo') {
    const w = content.logoWidth || logoSize;
    const h = content.logoHeight || logoSize;
    let x: number, y: number;
    if (content.logoX !== undefined && content.logoY !== undefined) {
      x = content.logoX;
      y = content.logoY;
    } else {
      const margin = Math.round(Math.min(format.width, format.height) * 0.05);
      const pos = content.logoPosition || 'top-left';
      x = margin;
      y = margin;
      if (pos.includes('right')) x = format.width - w - margin;
      if (pos.includes('bottom')) y = format.height - h - margin;
      if (pos === 'center') {
        x = (format.width - w) / 2;
        y = (format.height - h) / 2;
      }
      if (pos === 'top') {
        x = (format.width - w) / 2;
        y = margin;
      }
      if (pos === 'bottom') {
        x = (format.width - w) / 2;
        y = format.height - h - margin;
      }
    }
    return { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) };
  }

  // ── Shape ──────────────────────────────────────────────────────────────
  const shape = (content.shapes || []).find((s) => s.id === elementId);
  if (shape) {
    return {
      x: shape.x || 0,
      y: shape.y || 0,
      width: shape.width || 100,
      height: shape.height || 100,
    };
  }

  // ── Image ─────────────────────────────────────────────────────────────
  const image = (content.images || []).find((i) => i.id === elementId);
  if (image) {
    return {
      x: image.x || 0,
      y: image.y || 0,
      width: image.width || 200,
      height: image.height || 200,
    };
  }

  // ── Text ───────────────────────────────────────────────────────────────
  const text = content.texts.find((t) => t.id === elementId);
  if (text) {
    const textFontSize = Math.round(baseFontSize * (text.fontSize / 100));
    const paddingY = Math.round(text.paddingY || 8);
    const bgStyle = text.bgStyle || 'full-width';
    const isFullWidth = !text.width && bgStyle !== 'inline';

    let x: number, y: number;
    if (text.x !== undefined && text.y !== undefined) {
      x = text.x;
      y = text.y;
    } else {
      const elementHeight = textFontSize * 1.2 + paddingY * 2;
      switch (text.position) {
        case 'top':
          y = format.height * 0.2 - elementHeight / 2;
          break;
        case 'bottom':
          y = format.height * 0.8 - elementHeight / 2;
          break;
        default:
          y = format.height * 0.5 - elementHeight / 2;
      }
      x = 0;
    }

    const w = isFullWidth ? format.width : text.width || 200;
    const h = text.height || textFontSize * 1.2 + paddingY * 2;

    return {
      x: isFullWidth ? 0 : Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
    };
  }

  return null;
}

// ─── Group creation ──────────────────────────────────────────────────────────

const PADDING = 4; // small padding around the bounding box

/**
 * Create a new ElementGroup from a list of selected element IDs.
 *
 * 1. Resolves every member's absolute position on the canvas.
 * 2. Computes the bounding box (group origin + size).
 * 3. Converts every member's position to be relative to the group.
 * 4. Returns { group, updatedContent } with positions already converted.
 */
export function createGroup(
  memberIds: string[],
  content: BannerContent,
  format: BannerFormat,
): { group: ElementGroup; updatedContent: BannerContent } | null {
  // Resolve absolute rects for all members
  const rects = new Map<string, ResolvedRect>();
  for (const id of memberIds) {
    const r = resolveElementRect(id, content, format);
    if (r) rects.set(id, r);
  }
  if (rects.size < 2) return null;

  // Compute bounding box
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of rects.values()) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }

  const groupX = Math.round(minX - PADDING);
  const groupY = Math.round(minY - PADDING);
  const groupW = Math.round(maxX - minX + PADDING * 2);
  const groupH = Math.round(maxY - minY + PADDING * 2);

  // Convert member positions to relative
  const updatedTexts = content.texts.map((t) => {
    const r = rects.get(t.id);
    if (!r) return t;
    const bgStyle = t.bgStyle || 'full-width';
    const isFullWidth = !t.width && bgStyle !== 'inline';
    return {
      ...t,
      x: r.x - groupX,
      y: r.y - groupY,
      // Force explicit width so the text renders correctly inside the group
      width: isFullWidth ? format.width : t.width || undefined,
    };
  });

  const updatedShapes = (content.shapes || []).map((s) => {
    const r = rects.get(s.id);
    if (!r) return s;
    return {
      ...s,
      x: r.x - groupX,
      y: r.y - groupY,
    };
  });

  const updatedImages = (content.images || []).map((i) => {
    const r = rects.get(i.id);
    if (!r) return i;
    return {
      ...i,
      x: r.x - groupX,
      y: r.y - groupY,
    };
  });

  // Convert logo if it's a member
  const updatedContent: BannerContent = {
    ...content,
    texts: updatedTexts,
    shapes: updatedShapes,
    images: updatedImages,
  };
  if (memberIds.includes('logo')) {
    const logoRect = rects.get('logo');
    if (logoRect) {
      updatedContent.logoX = logoRect.x - groupX;
      updatedContent.logoY = logoRect.y - groupY;
    }
  }

  const group: ElementGroup = {
    id: `group-${Date.now()}`,
    name: `Group ${(content.groups || []).length + 1}`,
    memberIds: [...memberIds],
    x: groupX,
    y: groupY,
    width: groupW,
    height: groupH,
  };

  updatedContent.groups = [...(content.groups || []), group];

  return { group, updatedContent };
}

// ─── Group dissolution ──────────────────────────────────────────────────────

/**
 * Dissolve a group: convert member positions back to absolute.
 * Returns updated content with the group removed.
 */
export function dissolveGroup(groupId: string, content: BannerContent): BannerContent {
  const groups = content.groups || [];
  const group = groups.find((g) => g.id === groupId);
  if (!group) return content;

  const gx = group.x;
  const gy = group.y;

  // Convert texts back to absolute
  const updatedTexts = content.texts.map((t) => {
    if (!group.memberIds.includes(t.id)) return t;
    return {
      ...t,
      x: (t.x || 0) + gx,
      y: (t.y || 0) + gy,
    };
  });

  // Convert shapes back to absolute
  const updatedShapes = (content.shapes || []).map((s) => {
    if (!group.memberIds.includes(s.id)) return s;
    return {
      ...s,
      x: (s.x || 0) + gx,
      y: (s.y || 0) + gy,
    };
  });

  const updatedImages = (content.images || []).map((i) => {
    if (!group.memberIds.includes(i.id)) return i;
    return {
      ...i,
      x: (i.x || 0) + gx,
      y: (i.y || 0) + gy,
    };
  });

  const updatedContent: BannerContent = {
    ...content,
    texts: updatedTexts,
    shapes: updatedShapes,
    images: updatedImages,
    groups: groups.filter((g) => g.id !== groupId),
  };

  // Convert logo back to absolute
  if (group.memberIds.includes('logo')) {
    updatedContent.logoX = (content.logoX || 0) + gx;
    updatedContent.logoY = (content.logoY || 0) + gy;
  }

  return updatedContent;
}
