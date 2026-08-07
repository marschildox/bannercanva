import { describe, it, expect } from 'vitest';
import { computeSmartLayout, getSafeArea } from './smart-positioning';
import { DEFAULT_CONTENT, type BannerFormat } from '../types/banner';

/** A spread of shapes including the extremes where margins used to collapse. */
const FORMATS: BannerFormat[] = [
  { id: 'sq-250', name: 'Square', width: 250, height: 250, category: 'square', aspectRatio: 1 },
  {
    id: 'hz-970x90',
    name: 'Large Leaderboard',
    width: 970,
    height: 90,
    category: 'horizontal',
    aspectRatio: 970 / 90,
  },
  {
    id: 'hz-300x50',
    name: 'Mobile Banner',
    width: 300,
    height: 50,
    category: 'horizontal',
    aspectRatio: 6,
  },
  {
    id: 'hz-1200x628',
    name: 'Facebook Sponsored Message',
    width: 1200,
    height: 628,
    category: 'horizontal',
    aspectRatio: 1200 / 628,
  },
  {
    id: 'vt-120x600',
    name: 'Skyscraper',
    width: 120,
    height: 600,
    category: 'vertical',
    aspectRatio: 0.2,
  },
  {
    id: 'vt-1080x1920',
    name: 'Story',
    width: 1080,
    height: 1920,
    category: 'vertical',
    aspectRatio: 0.5625,
  },
];

const content = {
  ...DEFAULT_CONTENT,
  texts: [
    { ...DEFAULT_CONTENT.texts[0], id: 't1', text: 'Work flows better here' },
    { ...DEFAULT_CONTENT.texts[0], id: 't2', text: 'Adjustable in one tap', fontSize: 60 },
  ],
  ctas: [{ id: 'c1', text: 'Get Started' }],
};

describe('getSafeArea', () => {
  it('derives each axis from its own dimension, not the smaller one', () => {
    // The old single-margin formula gave a 970x90 leaderboard 5px on every
    // side; the horizontal room now comes from the 970, not the 90.
    const leaderboard = getSafeArea(FORMATS[1]);
    expect(leaderboard.x).toBe(58);
    expect(leaderboard.y).toBe(8);

    const skyscraper = getSafeArea(FORMATS[4]);
    expect(skyscraper.x).toBe(8);
    expect(skyscraper.y).toBe(36);
  });

  it('floors tiny banners and caps huge ones', () => {
    const tiny = getSafeArea({ ...FORMATS[0], width: 60, height: 40 });
    expect(tiny.x).toBe(8);
    expect(tiny.y).toBe(8);

    const huge = getSafeArea({ ...FORMATS[0], width: 4000, height: 4000 });
    expect(huge.x).toBe(96);
    expect(huge.y).toBe(96);
  });
});

describe('computeSmartLayout keeps content inside the safe area', () => {
  for (const format of FORMATS) {
    it(`${format.name} (${format.width}x${format.height})`, () => {
      const laid = computeSmartLayout(content, format);
      const safe = getSafeArea(format);

      // Text frames
      for (const text of laid.texts) {
        expect(text.x, `${text.id} left`).toBeGreaterThanOrEqual(0);
        expect(text.x!, `${text.id} respects left safe area`).toBeGreaterThanOrEqual(safe.x - 1);
        const right = text.x! + (text.width ?? 0);
        expect(right, `${text.id} respects right safe area`).toBeLessThanOrEqual(
          format.width - safe.x + 1,
        );
        expect(text.y!, `${text.id} respects top safe area`).toBeGreaterThanOrEqual(safe.y - 1);
        expect(text.y!, `${text.id} starts inside the canvas`).toBeLessThan(format.height);
      }

      // CTA group
      expect(laid.ctaGroupX!, 'cta left').toBeGreaterThanOrEqual(safe.x - 1);
      expect(laid.ctaGroupY!, 'cta top').toBeGreaterThanOrEqual(safe.y - 1);
      expect(laid.ctaGroupX!, 'cta inside canvas').toBeLessThan(format.width);
      expect(laid.ctaGroupY!, 'cta inside canvas').toBeLessThan(format.height);

      // Logo
      expect(laid.logoX!, 'logo left').toBeGreaterThanOrEqual(safe.x - 1);
      expect(laid.logoY!, 'logo top').toBeGreaterThanOrEqual(safe.y - 1);
      expect(laid.logoX! + (laid.logoWidth ?? 0), 'logo right').toBeLessThanOrEqual(
        format.width - safe.x + 1,
      );
    });
  }

  it('is idempotent — re-running does not drift positions', () => {
    const format = FORMATS[5];
    const once = computeSmartLayout(content, format);
    const twice = computeSmartLayout(once, format);
    expect(twice.texts.map((t) => [t.x, t.y])).toEqual(once.texts.map((t) => [t.x, t.y]));
    expect([twice.ctaGroupX, twice.ctaGroupY]).toEqual([once.ctaGroupX, once.ctaGroupY]);
  });
});
