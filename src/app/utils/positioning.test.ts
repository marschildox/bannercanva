import { describe, it, expect } from 'vitest';
import { getNextAvailablePosition, getNextCTAPosition, getNextShapePosition } from './positioning';
import { DEFAULT_CONTENT, type BannerContent } from '../types/banner';

describe('getNextAvailablePosition', () => {
  it('prefers center, then top, then bottom', () => {
    expect(getNextAvailablePosition([])).toBe('center');
    expect(getNextAvailablePosition(['center'])).toBe('top');
    expect(getNextAvailablePosition(['center', 'top'])).toBe('bottom');
  });

  it('falls back to the least used position when all are taken', () => {
    expect(getNextAvailablePosition(['center', 'top', 'bottom', 'center'])).toBe('top');
  });
});

describe('getNextCTAPosition', () => {
  it('keeps current position when there are no CTAs', () => {
    const content: BannerContent = { ...DEFAULT_CONTENT, ctas: [], ctaPosition: 'bottom' };
    expect(getNextCTAPosition(content)).toBe('bottom');
  });

  it('cycles to the next slot per existing CTA', () => {
    const content: BannerContent = {
      ...DEFAULT_CONTENT,
      ctas: [{ id: 'cta-1', text: 'Buy' }],
      ctaPosition: 'bottom',
    };
    expect(getNextCTAPosition(content)).toBe('center');
  });
});

describe('getNextShapePosition', () => {
  it('offsets 30px per existing shape', () => {
    const empty: BannerContent = { ...DEFAULT_CONTENT, shapes: [] };
    expect(getNextShapePosition(empty)).toEqual({ x: 100, y: 100 });

    const withTwo: BannerContent = {
      ...DEFAULT_CONTENT,
      shapes: [
        { id: 's1', type: 'rectangle', color: '#000', opacity: 100 },
        { id: 's2', type: 'circle', color: '#000', opacity: 100 },
      ],
    };
    expect(getNextShapePosition(withTwo)).toEqual({ x: 160, y: 160 });
  });
});
