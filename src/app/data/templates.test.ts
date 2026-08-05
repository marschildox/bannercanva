import { describe, it, expect } from 'vitest';
import { BANNER_TEMPLATES } from './templates';

describe('BANNER_TEMPLATES', () => {
  it('has unique template ids', () => {
    const ids = BANNER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template builds valid, format-agnostic content', () => {
    for (const template of BANNER_TEMPLATES) {
      const content = template.build();

      // At least a headline and a CTA
      expect(content.texts.length, template.id).toBeGreaterThan(0);
      expect(content.ctas.length, template.id).toBeGreaterThan(0);

      // Format-agnostic: no absolute coordinates — only zone positions,
      // so the template adapts to any banner format on the board
      for (const t of content.texts) {
        expect(t.x, `${template.id}: texts must not set x`).toBeUndefined();
        expect(t.y, `${template.id}: texts must not set y`).toBeUndefined();
        expect(['top', 'center', 'bottom']).toContain(t.position);
      }
      for (const s of content.shapes) {
        expect(s.isBackground, `${template.id}: shapes must be full-bleed scrims`).toBe(true);
      }

      // Photos must come from a CORS-friendly host or be empty
      if (content.backgroundImage) {
        expect(content.backgroundImage).toMatch(/^https:\/\/images\.unsplash\.com\//);
      }
    }
  });

  it('build() returns fresh element ids on every call', () => {
    const template = BANNER_TEMPLATES[0];
    const a = template.build();
    const b = template.build();
    expect(a.texts[0].id).not.toBe(b.texts[0].id);
    expect(a.ctas[0].id).not.toBe(b.ctas[0].id);
    // and fresh object references (no shared mutable state)
    expect(a.shapes).not.toBe(b.shapes);
  });
});
