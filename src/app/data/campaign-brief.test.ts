import { describe, it, expect } from 'vitest';
import { buildCampaignContent, DEFAULT_BRAND } from './campaign-brief';
import type { CopyVariant } from '../services/ai/types';

const copy: CopyVariant = {
  headline: 'Work standing',
  subheadline: 'Ship more before lunch',
  cta: 'Try free',
};

describe('buildCampaignContent', () => {
  it('maps copy into a headline, a subheadline and a CTA', () => {
    const content = buildCampaignContent(copy, DEFAULT_BRAND);

    expect(content.texts.map((t) => t.text)).toEqual(['Work standing', 'Ship more before lunch']);
    expect(content.ctas).toHaveLength(1);
    expect(content.ctas[0].text).toBe('Try free');
  });

  it('omits the subheadline text element when the copy has none', () => {
    const content = buildCampaignContent({ ...copy, subheadline: '   ' }, DEFAULT_BRAND);
    expect(content.texts).toHaveLength(1);
  });

  it('stays format-agnostic: zone positions, no absolute coordinates', () => {
    const content = buildCampaignContent(copy, {
      ...DEFAULT_BRAND,
      backgroundImage: 'data:image/png;base64,AAA',
    });

    for (const text of content.texts) {
      expect(text.x).toBeUndefined();
      expect(text.y).toBeUndefined();
      expect(['top', 'center', 'bottom']).toContain(text.position);
    }
    expect(content.logoX).toBeUndefined();
    expect(content.ctaGroupX).toBeUndefined();
    expect(content.shapes.every((s) => s.isBackground)).toBe(true);
  });

  it('adds a scrim only when there is a background image to darken', () => {
    expect(buildCampaignContent(copy, DEFAULT_BRAND).shapes).toHaveLength(0);

    const withPhoto = buildCampaignContent(copy, {
      ...DEFAULT_BRAND,
      backgroundImage: 'https://images.unsplash.com/photo-1',
      scrimOpacity: 40,
    });
    expect(withPhoto.shapes).toHaveLength(1);
    expect(withPhoto.shapes[0].opacity).toBe(40);

    const noScrim = buildCampaignContent(copy, {
      ...DEFAULT_BRAND,
      backgroundImage: 'https://images.unsplash.com/photo-1',
      scrimOpacity: 0,
    });
    expect(noScrim.shapes).toHaveLength(0);
  });

  it('applies brand font, logo and button colors', () => {
    const content = buildCampaignContent(copy, {
      ...DEFAULT_BRAND,
      fontFamily: 'Oswald',
      logo: 'data:image/png;base64,LOGO',
      ctaBgColor: '#ff0000',
      ctaTextColor: '#000000',
    });

    expect(content.texts.every((t) => t.fontFamily === 'Oswald')).toBe(true);
    expect(content.logo).toBe('data:image/png;base64,LOGO');
    expect(content.ctaBgColor).toBe('#ff0000');
    expect(content.ctaTextColor).toBe('#000000');
  });

  it('gives every element a unique id across invocations', () => {
    const a = buildCampaignContent(copy, DEFAULT_BRAND);
    const b = buildCampaignContent(copy, DEFAULT_BRAND);
    expect(a.texts[0].id).not.toBe(b.texts[0].id);
    expect(a.ctas[0].id).not.toBe(b.ctas[0].id);
  });
});
