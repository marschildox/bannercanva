import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  decideTextStyle,
  AUTO_LIGHT_COLOR,
  AUTO_DARK_COLOR,
} from './text-contrast';
import { SQUARE_FORMATS, type TextElement } from '../types/banner';

const FORMAT = SQUARE_FORMATS[1]; // Instagram Post 1080x1080 → baseFontSize 86.4

function makeText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'txt-1',
    text: 'Hello',
    fontSize: 100,
    color: '#ffffff',
    bgColor: 'transparent',
    bgOpacity: 0,
    position: 'center',
    bgStyle: 'full-width',
    ...overrides,
  };
}

describe('color math', () => {
  it('parses hex colors (3 and 6 digits)', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#112233')).toEqual({ r: 17, g: 34, b: 51 });
    expect(hexToRgb('not-a-color')).toBeNull();
  });

  it('computes WCAG luminance and contrast', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
    // white vs black = 21:1
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 1);
  });
});

describe('decideTextStyle', () => {
  it('turns text dark on a light background', () => {
    const stats = { luminance: 0.9, deviation: 0.05 };
    const decision = decideTextStyle(stats, makeText({ color: '#ffffff' }), FORMAT);
    expect(decision?.color).toBe(AUTO_DARK_COLOR);
  });

  it('turns text white on a dark background', () => {
    const stats = { luminance: 0.03, deviation: 0.05 };
    const decision = decideTextStyle(stats, makeText({ color: '#111827' }), FORMAT);
    expect(decision?.color).toBe(AUTO_LIGHT_COLOR);
  });

  it('keeps a user color that already has enough contrast', () => {
    // Yellow on near-black: ratio well above 4.5
    const stats = { luminance: 0.02, deviation: 0.05 };
    const decision = decideTextStyle(stats, makeText({ color: '#fbbf24' }), FORMAT);
    expect(decision?.color).toBeUndefined();
  });

  it('needs no changes when white text sits on a calm dark background', () => {
    const stats = { luminance: 0.03, deviation: 0.05 };
    const decision = decideTextStyle(stats, makeText({ color: '#ffffff' }), FORMAT);
    expect(decision).toBeNull();
  });

  it('bumps weight to semibold on busy backgrounds', () => {
    const stats = { luminance: 0.05, deviation: 0.3 };
    const decision = decideTextStyle(stats, makeText({ color: '#ffffff' }), FORMAT);
    expect(decision?.fontWeight).toBe('semibold');
  });

  it('never downgrades an existing bold weight', () => {
    const stats = { luminance: 0.05, deviation: 0.3 };
    const decision = decideTextStyle(
      stats,
      makeText({ color: '#ffffff', fontWeight: 'bold' }),
      FORMAT,
    );
    expect(decision).toBeNull();
  });

  it('falls back to large bold text on mid-tone backgrounds', () => {
    // Mid-gray (~0.2): white reaches 4.2:1 and dark 4.2:1 — neither hits 4.5
    const stats = { luminance: 0.2, deviation: 0.05 };
    const smallText = makeText({ color: '#ffffff', fontSize: 20 });
    const decision = decideTextStyle(stats, smallText, FORMAT);
    expect(decision?.fontWeight).toBe('bold');
    // 24px on a 1080x1080 banner (base 86.4px) → ≥ 28%
    expect(decision?.fontSize).toBeGreaterThanOrEqual(28);
  });
});
