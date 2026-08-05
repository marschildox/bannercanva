import { BannerColumn, BannerContent } from '../types/banner';

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT PERSISTENCE
// Serializes the whole board (columns + per-banner contents) so work survives
// reloads (localStorage autosave) and can be exported/imported as a JSON file.
// Thumbnails are intentionally not persisted — they regenerate automatically.
// ═══════════════════════════════════════════════════════════════════════════

export const PROJECT_STORAGE_KEY = 'bannercanva-project-v1';

export interface SerializedProject {
  app: 'bannercanva';
  version: 1;
  savedAt: string;
  columns: BannerColumn[];
  contents: Array<[string, BannerContent]>;
}

export function serializeProject(
  columns: BannerColumn[],
  contents: Map<string, BannerContent>,
): SerializedProject {
  return {
    app: 'bannercanva',
    version: 1,
    savedAt: new Date().toISOString(),
    columns,
    contents: Array.from(contents.entries()),
  };
}

/** Validate + revive a parsed project. Returns null on anything malformed. */
export function deserializeProject(
  data: unknown,
): { columns: BannerColumn[]; contents: Map<string, BannerContent> } | null {
  if (!data || typeof data !== 'object') return null;
  const project = data as Partial<SerializedProject>;
  if (project.app !== 'bannercanva' || project.version !== 1) return null;
  if (!Array.isArray(project.columns) || project.columns.length === 0) return null;
  if (!Array.isArray(project.contents)) return null;

  for (const column of project.columns) {
    if (!column?.masterFormat?.id || !Array.isArray(column.childFormats)) return null;
  }
  for (const entry of project.contents) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !entry[1]?.texts) return null;
  }

  return {
    columns: project.columns as BannerColumn[],
    contents: new Map(project.contents as Array<[string, BannerContent]>),
  };
}

export function saveProjectToLocalStorage(
  columns: BannerColumn[],
  contents: Map<string, BannerContent>,
): void {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(serializeProject(columns, contents)));
  } catch {
    // Quota exceeded (e.g. huge data-URL backgrounds) — autosave silently skips.
  }
}

export function loadProjectFromLocalStorage(): {
  columns: BannerColumn[];
  contents: Map<string, BannerContent>;
} | null {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    return deserializeProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearProjectFromLocalStorage(): void {
  try {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
