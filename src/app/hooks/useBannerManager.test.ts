import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { useBannerManager } from './useBannerManager';
import {
  DEFAULT_CONTENT,
  SQUARE_FORMATS,
  HORIZONTAL_FORMATS,
  type BannerContent,
} from '../types/banner';

const SUPER_MASTER_ID = SQUARE_FORMATS[3].id;

// StrictMode double-invokes state updaters, catching impure updates
// (e.g. mutating the previous state) exactly like the real app entry does.
function setup() {
  return renderHook(() => useBannerManager({ ...DEFAULT_CONTENT }), { wrapper: StrictMode });
}

describe('useBannerManager', () => {
  // The hook autosaves to localStorage and restores on mount — without this,
  // one test's autosaved board would be restored by the next test.
  beforeEach(() => localStorage.clear());

  it('starts with one square column whose master is the super master', () => {
    const { result } = setup();
    expect(result.current.columns).toHaveLength(1);
    expect(result.current.columns[0].category).toBe('square');
    expect(result.current.columns[0].masterFormat.id).toBe(SUPER_MASTER_ID);
    expect(result.current.bannerContents.get(SUPER_MASTER_ID)).toBeDefined();
  });

  it('addColumn inherits content from the super master', () => {
    const { result } = setup();
    act(() => result.current.addColumn('horizontal'));

    expect(result.current.columns).toHaveLength(2);
    const newMasterId = result.current.columns[1].masterFormat.id;
    const inherited = result.current.bannerContents.get(newMasterId);
    expect(inherited).toBeDefined();
    expect(inherited!.backgroundImage).toBe(DEFAULT_CONTENT.backgroundImage);
  });

  it('addChildBanner inherits content from its column master', () => {
    const { result } = setup();
    const childFormat = SQUARE_FORMATS[0];
    act(() => result.current.addChildBanner(0, childFormat));

    expect(result.current.columns[0].childFormats).toHaveLength(1);
    const childContent = result.current.bannerContents.get(childFormat.id);
    expect(childContent).toBeDefined();
    expect(childContent!.backgroundImage).toBe(DEFAULT_CONTENT.backgroundImage);
  });

  it('super master edits propagate to every banner', () => {
    const { result } = setup();
    act(() => {
      result.current.addColumn('horizontal');
      result.current.addChildBanner(0, SQUARE_FORMATS[0]);
    });

    const updated: BannerContent = {
      ...DEFAULT_CONTENT,
      backgroundImage: 'https://new.example/bg.png',
    };
    act(() => result.current.updateBannerContent(SUPER_MASTER_ID, updated));

    for (const [, content] of result.current.bannerContents) {
      expect(content.backgroundImage).toBe('https://new.example/bg.png');
    }
  });

  it('column master edits propagate only within its column', () => {
    const { result } = setup();
    act(() => result.current.addColumn('horizontal'));
    // add a child to the horizontal column (index 1)
    const childFormat = HORIZONTAL_FORMATS[0];
    act(() => result.current.addChildBanner(1, childFormat));

    const columnMasterId = result.current.columns[1].masterFormat.id;
    const updated: BannerContent = {
      ...DEFAULT_CONTENT,
      backgroundImage: 'https://col.example/bg.png',
    };
    act(() => result.current.updateBannerContent(columnMasterId, updated));

    // child in same column updated
    expect(result.current.bannerContents.get(childFormat.id)!.backgroundImage).toBe(
      'https://col.example/bg.png',
    );
    // super master untouched
    expect(result.current.bannerContents.get(SUPER_MASTER_ID)!.backgroundImage).toBe(
      DEFAULT_CONTENT.backgroundImage,
    );
  });

  it('child edits affect only that banner', () => {
    const { result } = setup();
    const childFormat = SQUARE_FORMATS[0];
    act(() => result.current.addChildBanner(0, childFormat));

    const updated: BannerContent = {
      ...DEFAULT_CONTENT,
      backgroundImage: 'https://child.example/bg.png',
    };
    act(() => result.current.updateBannerContent(childFormat.id, updated));

    expect(result.current.bannerContents.get(childFormat.id)!.backgroundImage).toBe(
      'https://child.example/bg.png',
    );
    expect(result.current.bannerContents.get(SUPER_MASTER_ID)!.backgroundImage).toBe(
      DEFAULT_CONTENT.backgroundImage,
    );
  });

  it('deleteColumn(0) is a no-op; deleting another column removes its contents', () => {
    const { result } = setup();
    act(() => result.current.addColumn('vertical'));
    const verticalMasterId = result.current.columns[1].masterFormat.id;

    act(() => result.current.deleteColumn(0));
    expect(result.current.columns).toHaveLength(2);

    act(() => result.current.deleteColumn(1));
    expect(result.current.columns).toHaveLength(1);
    expect(result.current.bannerContents.has(verticalMasterId)).toBe(false);
  });

  it('addChildBanner never duplicates a size already on the board', () => {
    const { result } = setup();
    const childFormat = SQUARE_FORMATS[0];
    act(() => result.current.addChildBanner(0, childFormat));
    act(() => result.current.addChildBanner(0, childFormat));

    expect(result.current.columns[0].childFormats).toHaveLength(1);
  });

  it('deleteChildBanner removes the child and its content', () => {
    const { result } = setup();
    const childFormat = SQUARE_FORMATS[0];
    act(() => result.current.addChildBanner(0, childFormat));
    act(() => result.current.deleteChildBanner(0, 0));

    expect(result.current.columns[0].childFormats).toHaveLength(0);
    expect(result.current.bannerContents.has(childFormat.id)).toBe(false);
  });

  it('propagation adapts element positions to the target format dimensions', () => {
    const { result } = setup();
    // SQUARE_FORMATS[0] is 1200x1200 vs the 250x250 super master → scale 4.8
    const childFormat = SQUARE_FORMATS[0];
    act(() => result.current.addChildBanner(0, childFormat));

    const edited: BannerContent = {
      ...DEFAULT_CONTENT,
      texts: [
        {
          ...DEFAULT_CONTENT.texts[0],
          id: 'txt-1',
          text: 'Hello',
          x: 100,
          y: 50,
        },
      ],
    };
    act(() => result.current.updateBannerContent(SUPER_MASTER_ID, edited));

    const childContent = result.current.bannerContents.get(childFormat.id)!;
    const scale = childFormat.width / SQUARE_FORMATS[3].width;
    expect(childContent.texts[0].x).toBe(Math.round(100 * scale));
    expect(childContent.texts[0].y).toBe(Math.round(50 * scale));
  });

  it('getAllBanners returns masters and children in column order', () => {
    const { result } = setup();
    act(() => {
      result.current.addChildBanner(0, SQUARE_FORMATS[0]);
      result.current.addColumn('horizontal');
    });

    const all = result.current.getAllBanners();
    expect(all.map((b) => b.id)).toEqual([
      SUPER_MASTER_ID,
      SQUARE_FORMATS[0].id,
      result.current.columns[1].masterFormat.id,
    ]);
  });
});

describe('startCampaign', () => {
  beforeEach(() => localStorage.clear());

  const campaignContent: BannerContent = {
    ...DEFAULT_CONTENT,
    texts: [{ ...DEFAULT_CONTENT.texts[0], id: 'camp-text', text: 'Work standing' }],
    ctas: [{ id: 'camp-cta', text: 'Try free' }],
  };

  it('builds a square-only board when no extra columns are requested', () => {
    const { result } = setup();
    act(() => result.current.startCampaign(campaignContent, {}));

    expect(result.current.columns).toHaveLength(1);
    expect(result.current.bannerContents.size).toBe(1);
    expect(result.current.bannerContents.get(SUPER_MASTER_ID)!.texts[0].text).toBe('Work standing');
  });

  it('seeds horizontal and vertical columns adapted to their own formats', () => {
    const { result } = setup();
    act(() => result.current.startCampaign(campaignContent, { horizontal: true, vertical: true }));

    expect(result.current.columns.map((c) => c.category)).toEqual([
      'square',
      'horizontal',
      'vertical',
    ]);
    expect(result.current.bannerContents.size).toBe(3);

    // Each column master carries the campaign copy, laid out for its format
    for (const column of result.current.columns) {
      const content = result.current.bannerContents.get(column.masterFormat.id)!;
      expect(content.texts[0].text).toBe('Work standing');
      expect(content.ctas[0].text).toBe('Try free');
      // Layout ran: zone positions became explicit coordinates
      expect(typeof content.texts[0].x).toBe('number');
    }
  });

  it('replaces any previous board instead of merging into it', () => {
    const { result } = setup();
    act(() => result.current.addChildBanner(0, SQUARE_FORMATS[0]));
    expect(result.current.columns[0].childFormats).toHaveLength(1);

    act(() => result.current.startCampaign(campaignContent, {}));
    expect(result.current.columns[0].childFormats).toHaveLength(0);
    expect(result.current.bannerContents.has(SQUARE_FORMATS[0].id)).toBe(false);
  });
});
