// ═══════════════════════════════════════════════════════════════════════════
// AI SERVICE — shared types
//
// BannerCanva is a fully client-side tool: there is no backend to hold
// credentials, so AI features run on keys the user supplies and calls go
// straight from the browser to the provider. That trade-off is stated in the
// settings dialog. Providers are addressed directly (Anthropic / Google), so
// no third-party gateway sits in the path.
// ═══════════════════════════════════════════════════════════════════════════

/** Copy generation runs on Claude; image generation runs on Gemini. */
export interface AiSettings {
  anthropicApiKey: string;
  geminiApiKey: string;
  copyModel: CopyModel;
}

export const COPY_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5 — best quality' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — faster, cheaper' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — fastest' },
] as const;

export type CopyModel = (typeof COPY_MODELS)[number]['id'];

/** The campaign brief the copywriter works from. */
export interface CopyBrief {
  product: string;
  objective: string;
  tone: string;
  audience?: string;
  /** Extra constraints, e.g. "mention the 30-day trial", "avoid superlatives" */
  notes?: string;
  /** How many alternative sets to produce (1–5) */
  variants: number;
}

export interface CopyVariant {
  headline: string;
  subheadline: string;
  cta: string;
}

export interface ImageBrief {
  prompt: string;
  /** Target aspect ratio, e.g. "1:1", "16:9", "9:16" — steers composition */
  aspectRatio: string;
}

/** Thrown by every AI call so the UI can show one clear message. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
