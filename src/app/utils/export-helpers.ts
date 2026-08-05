// ═══════════════════════════════════════════════════════════════════════════════
// Shared export / capture utilities
//
// Single source of truth for:
//  - oklch → rgb conversion
//  - Nuclear DOM clone cleanup (strips Tailwind, oklch, CSS vars, transitions)
//  - CORS image pre-warming
//  - Off-screen clone factory
//
// Used by both the full-quality export pipeline (useBannerExport)
// and the low-resolution thumbnail generator (useAutoThumbnails).
// ═══════════════════════════════════════════════════════════════════════════════

// ─── oklch → rgb math ─────────────────────────────────────────────────────────

export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const gamma = (x: number) => {
    if (x >= 0.0031308) return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return 12.92 * x;
  };

  return [
    Math.round(Math.max(0, Math.min(1, gamma(r))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(g))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(b_))) * 255),
  ];
}

// ─── Color conversion (oklch / color-mix → rgb) ──────────────────────────────

const PROPS_TO_CONVERT = [
  'color',
  'background-color',
  'background',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
  'box-shadow',
  'text-shadow',
  'caret-color',
  'column-rule-color',
  'flood-color',
  'lighting-color',
  'stop-color',
  'text-emphasis-color',
] as const;

const OKLCH_RE = /oklch\s*\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\)/g;

const COLOR_MIX_RE =
  /color-mix\s*\(\s*in\s+(?:oklch|srgb|hsl|lab|lch)[^,]*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;

/**
 * Walk every element inside `root` and convert any oklch()/color-mix() colour
 * values to rgb()/rgba() so html2canvas can render them.
 */
export function convertOklchInPlace(root: HTMLElement) {
  const els = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];
  const view = root.ownerDocument.defaultView || window;

  for (const el of els) {
    const computed = view.getComputedStyle(el);
    for (const prop of PROPS_TO_CONVERT) {
      let val = computed.getPropertyValue(prop);
      if (!val) continue;

      if (val.includes('color-mix')) {
        val = val.replace(COLOR_MIX_RE, (_m, color1) => {
          const cleaned = color1.replace(/\s+\d+%$/, '').trim();
          return cleaned || 'transparent';
        });
      }

      if (val.includes('oklch')) {
        val = val.replace(OKLCH_RE, (_m, lRaw, cRaw, hRaw, aRaw) => {
          let lv = parseFloat(lRaw);
          let cv = parseFloat(cRaw);
          if (lRaw.includes('%')) lv /= 100;
          if (cRaw.includes('%')) cv /= 100;
          const rgb = oklchToRgb(lv, cv, parseFloat(hRaw));
          if (aRaw) {
            let av = parseFloat(aRaw);
            if (aRaw.includes('%')) av /= 100;
            return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${av})`;
          }
          return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        });
      }

      if (val !== computed.getPropertyValue(prop)) {
        el.style.setProperty(prop, val, 'important');
      }
    }
  }
}

// ─── Nuclear clone cleanup ────────────────────────────────────────────────────

/**
 * NUCLEAR clean-up of an off-screen clone before html2canvas capture.
 *
 * Strategy:
 *  1. Remove `data-export-ignore` + `data-cors-preload` nodes
 *  2. Remove ALL `className` on every element → severs ALL CSS class rules
 *  3. Read *computed* border/shadow to detect intentional (visible) values
 *  4. Force-kill outline, border, box-shadow where NOT intentional
 *  5. Kill transitions, animations, CSS custom properties
 *  6. Convert oklch → rgb
 *
 * Reading computed styles (step 3) AFTER removing className (step 2)
 * means we only see inline styles + universal-selector rules.
 * Inline `border: 2px solid red` wins → preserved.
 * Universal `* { border-width: 0 }` → borderTopWidth = 0 → killed.
 */
export function cleanClone(el: HTMLElement, w: number, h: number) {
  const view = el.ownerDocument.defaultView || window;

  // ── 0. Force canvas root dimensions ────────────────────────────────
  // Preserve the original background-color from inline style if present
  const origBg = el.style.backgroundColor || '#ffffff';
  // Preserve font properties set on the canvas root so text elements that
  // use `font-family: inherit` resolve identically in the off-screen clone.
  const origFontFamily =
    el.style.fontFamily ||
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const origFontSize = el.style.fontSize || '16px';
  const origLineHeight = el.style.lineHeight || '1.5';
  const origColor = el.style.color || '#000000';
  el.style.cssText = [
    `width: ${w}px !important`,
    `height: ${h}px !important`,
    'transform: none !important',
    'transform-origin: top left !important',
    'overflow: hidden !important',
    'opacity: 1 !important',
    'position: relative !important',
    'pointer-events: none !important',
    `background-color: ${origBg}`,
    `font-family: ${origFontFamily}`,
    `font-size: ${origFontSize}`,
    `line-height: ${origLineHeight}`,
    `color: ${origColor}`,
    '-webkit-font-smoothing: antialiased',
  ].join('; ');
  el.removeAttribute('id');

  // ── 1. Remove selection / CORS-preload UI ──────────────────────────
  el.querySelectorAll('[data-export-ignore]').forEach((n) => n.remove());
  el.querySelectorAll('[data-cors-preload]').forEach((n) => n.remove());

  // ── 2. Process every element ───────────────────────────────────────
  const allEls = [el, ...Array.from(el.querySelectorAll('*'))] as HTMLElement[];

  for (const node of allEls) {
    // ─ 2a. Remove class → sever ALL CSS class rules ─────────────────
    node.removeAttribute('class');

    // ─ 2b. Remove ALL CSS custom properties ─────────────────────────
    const propsToRemove: string[] = [];
    for (let i = 0; i < node.style.length; i++) {
      const prop = node.style[i];
      if (prop.startsWith('--')) propsToRemove.push(prop);
    }
    for (const prop of propsToRemove) node.style.removeProperty(prop);

    // ─ 2c. Read computed styles to detect intentional values ─────────
    const computed = view.getComputedStyle(node);

    const borderTopStyle = computed.borderTopStyle;
    const borderTopWidth = parseFloat(computed.borderTopWidth) || 0;
    const hasVisibleBorder =
      borderTopStyle !== 'none' && borderTopStyle !== 'hidden' && borderTopWidth > 0;

    const computedShadow = computed.boxShadow;
    const hasVisibleShadow = !!computedShadow && computedShadow !== 'none';

    // ─ 2d. Kill outline completely ──────────────────────────────────
    node.style.setProperty('outline', 'none', 'important');
    node.style.setProperty('outline-style', 'none', 'important');
    node.style.setProperty('outline-width', '0', 'important');
    node.style.setProperty('outline-color', 'transparent', 'important');
    node.style.setProperty('outline-offset', '0', 'important');

    // ─ 2e. Kill border (unless intentional) ─────────────────────────
    if (!hasVisibleBorder) {
      node.style.setProperty('border-style', 'none', 'important');
      node.style.setProperty('border-width', '0', 'important');
      node.style.setProperty('border-color', 'transparent', 'important');
    }

    // ─ 2f. Kill box-shadow (unless intentional) ─────────────────────
    if (!hasVisibleShadow) {
      node.style.setProperty('box-shadow', 'none', 'important');
    }

    // ─ 2g. Kill transitions / animations / cursor ───────────────────
    node.style.setProperty('transition', 'none', 'important');
    node.style.setProperty('animation', 'none', 'important');
    node.style.setProperty('cursor', 'default', 'important');
    node.style.setProperty('pointer-events', 'none', 'important');

    // ─ 2h. Kill text-decoration if not intentional ──────────────────
    const rawStyle = node.getAttribute('style') || '';
    if (!rawStyle.includes('text-decoration')) {
      node.style.setProperty('text-decoration', 'none', 'important');
    }
  }

  // ── Resolve percentage-based transforms to computed matrices ──────
  // html2canvas v1.4.1 does NOT reliably resolve percentage-based
  // transforms like translateY(-50%) or translate(-50%, -50%).
  // The browser already resolved these to pixel-based matrix() values
  // via getComputedStyle. We read those and write them back as inline
  // styles so html2canvas sees unambiguous matrix(a,b,c,d,e,f) values.
  // Skip index 0 (the root) which was already forced to transform:none.
  for (let i = 1; i < allEls.length; i++) {
    const node = allEls[i];
    const computed = view.getComputedStyle(node);
    const resolvedTransform = computed.transform;
    if (resolvedTransform && resolvedTransform !== 'none') {
      node.style.setProperty('transform', resolvedTransform, 'important');
      const resolvedOrigin = computed.transformOrigin;
      if (resolvedOrigin) {
        node.style.setProperty('transform-origin', resolvedOrigin, 'important');
      }
    }
  }

  // ── 3. Convert oklch → rgb LAST ────────────────────────────────────
  convertOklchInPlace(el);
}

/**
 * Same cleanup applied to html2canvas's OWN clone (third level).
 * This is the last line of defence.
 */
export function cleanH2cClone(h2cClone: HTMLElement, w: number, h: number) {
  const view = h2cClone.ownerDocument.defaultView || window;

  h2cClone.style.setProperty('transform', 'none', 'important');
  h2cClone.style.setProperty('width', `${w}px`, 'important');
  h2cClone.style.setProperty('height', `${h}px`, 'important');
  h2cClone.style.setProperty('overflow', 'hidden', 'important');
  h2cClone.style.setProperty('opacity', '1', 'important');

  h2cClone.querySelectorAll('[data-export-ignore]').forEach((n) => n.remove());
  h2cClone.querySelectorAll('[data-cors-preload]').forEach((n) => n.remove());

  const allEls = [h2cClone, ...Array.from(h2cClone.querySelectorAll('*'))] as HTMLElement[];
  for (const node of allEls) {
    node.removeAttribute('class');

    const propsToRemove: string[] = [];
    for (let i = 0; i < node.style.length; i++) {
      if (node.style[i].startsWith('--')) propsToRemove.push(node.style[i]);
    }
    for (const prop of propsToRemove) node.style.removeProperty(prop);

    const computed = view.getComputedStyle(node);
    const bStyle = computed.borderTopStyle;
    const bWidth = parseFloat(computed.borderTopWidth) || 0;
    const hasVisibleBorder = bStyle !== 'none' && bStyle !== 'hidden' && bWidth > 0;
    const hasVisibleShadow = computed.boxShadow !== 'none' && !!computed.boxShadow;

    node.style.setProperty('outline', 'none', 'important');
    node.style.setProperty('outline-style', 'none', 'important');
    node.style.setProperty('outline-width', '0', 'important');
    node.style.setProperty('outline-color', 'transparent', 'important');

    if (!hasVisibleBorder) {
      node.style.setProperty('border-style', 'none', 'important');
      node.style.setProperty('border-width', '0', 'important');
      node.style.setProperty('border-color', 'transparent', 'important');
    }

    if (!hasVisibleShadow) {
      node.style.setProperty('box-shadow', 'none', 'important');
    }
  }

  // ── Resolve percentage-based transforms to computed matrices ──────
  // Same as cleanClone step 2i — third-level defence for html2canvas's
  // own clone. Skip index 0 (root already forced to transform:none).
  for (let i = 1; i < allEls.length; i++) {
    const node = allEls[i];
    const ct = view.getComputedStyle(node);
    const rt = ct.transform;
    if (rt && rt !== 'none') {
      node.style.setProperty('transform', rt, 'important');
      const ro = ct.transformOrigin;
      if (ro) node.style.setProperty('transform-origin', ro, 'important');
    }
  }

  const p = h2cClone.parentElement;
  if (p) {
    p.style.setProperty('overflow', 'visible', 'important');
    p.style.setProperty('width', `${w}px`, 'important');
    p.style.setProperty('height', `${h}px`, 'important');
  }
}

// ─── CORS pre-warm ────────────────────────────────────────────────────────────

/**
 * Pre-warm the CORS cache for ALL image URLs found in an element tree.
 * This ensures html2canvas's useCORS fetch succeeds on the first try.
 */
export async function preWarmCorsCache(element: HTMLElement) {
  const urls = new Set<string>();

  element.querySelectorAll('img').forEach((img) => {
    if (img.src && !img.src.startsWith('data:')) urls.add(img.src);
  });

  const allEls = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  for (const el of allEls) {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const matches = bg.matchAll(/url\(["']?([^"')]+)["']?\)/g);
      for (const match of matches) {
        if (!match[1].startsWith('data:')) urls.add(match[1]);
      }
    }
  }

  if (urls.size === 0) return;

  const promises = Array.from(urls).map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const timeout = setTimeout(() => resolve(), 5000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.src = url;
      }),
  );

  await Promise.all(promises);
}

// ─── Wait for all images inside an element to load ────────────────────────────

export async function waitForImages(element: HTMLElement, timeoutMs: number = 10000) {
  const imgs = element.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), timeoutMs);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    }),
  );
}

// ─── Off-screen capture factory ───────────────────────────────────────────────

export interface CaptureOptions {
  scale?: number;
  format?: 'png' | 'jpg' | 'webp';
  quality?: number;
  forThumbnail?: boolean; // lower quality, smaller scale
}

/**
 * Generic off-screen capture.  Creates a clone, cleans it, captures with
 * html2canvas, and returns a Blob or data-URL string.
 *
 * @returns Blob (for export) or data-URL string (for thumbnails), or null on error.
 */
export async function captureElement(
  elementId: string,
  width: number,
  height: number,
  opts: CaptureOptions & { returnType: 'blob' },
): Promise<Blob | null>;
export async function captureElement(
  elementId: string,
  width: number,
  height: number,
  opts: CaptureOptions & { returnType: 'dataUrl' },
): Promise<string | null>;
export async function captureElement(
  elementId: string,
  width: number,
  height: number,
  opts: CaptureOptions & { returnType: 'blob' | 'dataUrl' },
): Promise<Blob | string | null> {
  const { scale = 2, format = 'png', quality = 0.95, forThumbnail = false, returnType } = opts;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[capture] Element not found: ${elementId}`);
    return null;
  }

  // ── Fonts ────────────────────────────────────────────────────────────
  try {
    await document.fonts.ready;
  } catch {
    /* noop */
  }

  // ── CORS pre-warm (skip for thumbnails to save time) ─────────────────
  if (!forThumbnail) {
    await preWarmCorsCache(element);
  }

  // ── Wait for images ──────────────────────────────────────────────────
  await waitForImages(element, forThumbnail ? 3000 : 10000);

  // ── Settle ───────────────────────────────────────────────────────────
  await new Promise((r) => setTimeout(r, forThumbnail ? 50 : 150));

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Off-screen wrapper
  // ═══════════════════════════════════════════════════════════════════════
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-export-wrapper', 'true');
  wrapper.style.cssText = [
    'position: fixed',
    'left: 0',
    'top: 0',
    `width: ${width}px`,
    `height: ${height}px`,
    'overflow: visible',
    'z-index: -9999',
    'pointer-events: none',
    'opacity: 0.001',
  ].join('; ');

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Deep-clone
  // ═══════════════════════════════════════════════════════════════════════
  const clone = element.cloneNode(true) as HTMLElement;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Nuclear clean
  // ═══════════════════════════════════════════════════════════════════════
  cleanClone(clone, width, height);

  // Force reflow
  void clone.getBoundingClientRect();
  await new Promise((r) => setTimeout(r, forThumbnail ? 30 : 150));

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Capture — primary engine: html-to-image (SVG foreignObject).
  //    The browser itself rasterizes the clone, so text metrics, font
  //    weights and layout match the on-screen render exactly. html2canvas
  //    (which re-implements layout and drifts on text baselines) is kept
  //    only as a fallback.
  // ═══════════════════════════════════════════════════════════════════════
  const finishFromCanvas = (canvas: HTMLCanvasElement): Promise<Blob | string | null> => {
    if (returnType === 'dataUrl') {
      return Promise.resolve(canvas.toDataURL(`image/${format}`, quality));
    }
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), `image/${format}`, quality);
    });
  };

  try {
    const { toCanvas } = await import('html-to-image');
    const canvas = await toCanvas(clone, {
      width,
      height,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      cacheBust: false,
      // Embeds the Google-Fonts @font-face rules as data URLs so the
      // rasterized SVG uses the exact same fonts as the live canvas.
      skipFonts: false,
    });
    if (wrapper.parentNode) document.body.removeChild(wrapper);
    return await finishFromCanvas(canvas);
  } catch (error) {
    console.warn('[capture] html-to-image failed, falling back to html2canvas:', error);
  }

  try {
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width,
      height,
      foreignObjectRendering: false,
      imageTimeout: forThumbnail ? 5000 : 15000,
      removeContainer: true,
      onclone: (_doc, h2cClone) => {
        cleanH2cClone(h2cClone, width, height);
      },
    });

    if (wrapper.parentNode) document.body.removeChild(wrapper);
    return await finishFromCanvas(canvas);
  } catch (error) {
    if (wrapper.parentNode) document.body.removeChild(wrapper);
    console.error('[capture] html2canvas error:', error);
    return null;
  }
}
