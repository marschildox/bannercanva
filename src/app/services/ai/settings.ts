import { AiSettings, COPY_MODELS, CopyModel } from './types';

const STORAGE_KEY = 'bannercanva-ai-settings-v1';

export const EMPTY_AI_SETTINGS: AiSettings = {
  anthropicApiKey: '',
  geminiApiKey: '',
  copyModel: 'claude-opus-5',
};

function isCopyModel(value: unknown): value is CopyModel {
  return COPY_MODELS.some((m) => m.id === value);
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_AI_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      anthropicApiKey:
        typeof parsed.anthropicApiKey === 'string' ? parsed.anthropicApiKey.trim() : '',
      geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey.trim() : '',
      copyModel: isCopyModel(parsed.copyModel) ? parsed.copyModel : EMPTY_AI_SETTINGS.copyModel,
    };
  } catch {
    return { ...EMPTY_AI_SETTINGS };
  }
}

export function saveAiSettings(settings: AiSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings just won't persist */
  }
}

export function clearAiSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Show only the last 4 characters of a stored key. */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••';
  return `••••••••${trimmed.slice(-4)}`;
}
