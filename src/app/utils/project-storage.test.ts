import { describe, it, expect, beforeEach } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  saveProjectToLocalStorage,
  loadProjectFromLocalStorage,
  clearProjectFromLocalStorage,
} from './project-storage';
import { DEFAULT_CONTENT, SQUARE_FORMATS, HORIZONTAL_FORMATS } from '../types/banner';
import type { BannerColumn } from '../types/banner';

const columns: BannerColumn[] = [
  {
    id: 'col-1',
    category: 'square',
    masterFormat: SQUARE_FORMATS[3],
    childFormats: [SQUARE_FORMATS[0]],
  },
  {
    id: 'col-2',
    category: 'horizontal',
    masterFormat: HORIZONTAL_FORMATS[0],
    childFormats: [],
  },
];

function makeContents() {
  return new Map([
    [SQUARE_FORMATS[3].id, { ...DEFAULT_CONTENT }],
    [SQUARE_FORMATS[0].id, { ...DEFAULT_CONTENT, backgroundImage: 'https://x/y.png' }],
    [HORIZONTAL_FORMATS[0].id, { ...DEFAULT_CONTENT }],
  ]);
}

describe('project serialization', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips columns and per-banner contents', () => {
    const serialized = serializeProject(columns, makeContents());
    const revived = deserializeProject(JSON.parse(JSON.stringify(serialized)));

    expect(revived).not.toBeNull();
    expect(revived!.columns).toEqual(columns);
    expect(revived!.contents.size).toBe(3);
    expect(revived!.contents.get(SQUARE_FORMATS[0].id)!.backgroundImage).toBe('https://x/y.png');
  });

  it('rejects payloads that are not bannercanva projects', () => {
    expect(deserializeProject(null)).toBeNull();
    expect(deserializeProject({})).toBeNull();
    expect(deserializeProject({ app: 'something-else', version: 1 })).toBeNull();
    expect(deserializeProject({ app: 'bannercanva', version: 99 })).toBeNull();
    // right envelope, malformed payload
    expect(
      deserializeProject({ app: 'bannercanva', version: 1, columns: [], contents: [] }),
    ).toBeNull();
    expect(
      deserializeProject({
        app: 'bannercanva',
        version: 1,
        columns: [{ id: 'x' }],
        contents: [],
      }),
    ).toBeNull();
  });

  it('saves to and loads from localStorage', () => {
    saveProjectToLocalStorage(columns, makeContents());
    const loaded = loadProjectFromLocalStorage();

    expect(loaded).not.toBeNull();
    expect(loaded!.columns[1].masterFormat.id).toBe(HORIZONTAL_FORMATS[0].id);

    clearProjectFromLocalStorage();
    expect(loadProjectFromLocalStorage()).toBeNull();
  });

  it('returns null instead of throwing on corrupted storage', () => {
    localStorage.setItem('bannercanva-project-v1', '{ not json');
    expect(loadProjectFromLocalStorage()).toBeNull();
  });
});
