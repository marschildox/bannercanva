import { AiError, CopyBrief, CopyModel, CopyVariant } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// AD COPY GENERATION (Claude, structured outputs)
// The network call and the response parsing are separated so the parsing —
// where the real failure modes live — is unit-testable without a live key.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Structured-output schema. Array length constraints (minItems/maxItems) are
 * not supported by structured outputs, so the count is requested in the
 * prompt and enforced when parsing.
 */
export const COPY_SCHEMA = {
  type: 'object',
  properties: {
    variants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: 'Punchy banner headline, under ~45 characters' },
          subheadline: {
            type: 'string',
            description: 'Supporting line, under ~70 characters',
          },
          cta: { type: 'string', description: 'Button label, 1–3 words, imperative' },
        },
        required: ['headline', 'subheadline', 'cta'],
        additionalProperties: false,
      },
    },
  },
  required: ['variants'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a senior advertising copywriter producing text for display banner ads.

Banner ads are read in under two seconds at small sizes, so:
- Headlines are short and concrete. No filler, no throat-clearing, no "Discover the power of".
- Subheadlines add one specific reason to care (a benefit, a number, an offer) — they do not restate the headline.
- CTAs are 1-3 words, imperative, and specific to the action ("Start free trial", not "Click here").
- Never invent facts, prices, statistics, or claims that were not given in the brief.
- Write in the language of the brief.

Each variant must take a genuinely different angle, not reword the previous one.`;

export function buildCopyPrompt(brief: CopyBrief): string {
  const lines = [
    `Product or service: ${brief.product}`,
    `Campaign objective: ${brief.objective}`,
    `Tone: ${brief.tone}`,
  ];
  if (brief.audience?.trim()) lines.push(`Audience: ${brief.audience.trim()}`);
  if (brief.notes?.trim()) lines.push(`Additional constraints: ${brief.notes.trim()}`);
  lines.push(
    '',
    `Write exactly ${brief.variants} distinct variant${brief.variants === 1 ? '' : 's'}, each with a headline, a subheadline and a CTA.`,
  );
  return lines.join('\n');
}

/** Validate and normalize the model's JSON. Throws AiError on anything unusable. */
export function parseCopyResponse(rawJson: string, expected: number): CopyVariant[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new AiError('The model returned a response that could not be read as JSON.');
  }

  const variants = (parsed as { variants?: unknown })?.variants;
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new AiError('The model returned no copy variants.');
  }

  const cleaned: CopyVariant[] = [];
  for (const variant of variants) {
    const v = variant as Partial<CopyVariant>;
    if (
      typeof v.headline !== 'string' ||
      typeof v.subheadline !== 'string' ||
      typeof v.cta !== 'string'
    ) {
      continue;
    }
    const headline = v.headline.trim();
    const cta = v.cta.trim();
    if (!headline || !cta) continue;
    cleaned.push({ headline, subheadline: v.subheadline.trim(), cta });
  }

  if (cleaned.length === 0) {
    throw new AiError('The model returned copy variants with missing fields.');
  }
  // More variants than asked for is harmless — trim; fewer is still usable.
  return cleaned.slice(0, Math.max(1, expected));
}

/** Concatenate the text blocks of a Messages API response. */
export function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('');
}

export async function generateCopy(
  brief: CopyBrief,
  apiKey: string,
  model: CopyModel,
): Promise<CopyVariant[]> {
  if (!apiKey.trim()) {
    throw new AiError('Add an Anthropic API key in AI settings to generate copy.');
  }

  // Loaded on demand so the SDK stays out of the initial bundle.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: apiKey.trim(),
    // No backend exists to proxy this call; the user supplies their own key.
    dangerouslyAllowBrowser: true,
  });

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildCopyPrompt(brief) }],
      output_config: { format: { type: 'json_schema', schema: COPY_SCHEMA } },
    });
  } catch (error) {
    throw new AiError(describeProviderError(error), error);
  }

  if (response.stop_reason === 'refusal') {
    throw new AiError('The model declined this brief. Try rephrasing the product or objective.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiError('The response was cut off. Try asking for fewer variants.');
  }

  return parseCopyResponse(extractText(response.content), brief.variants);
}

/** Turn an SDK/network error into something a user can act on. */
export function describeProviderError(error: unknown): string {
  const status = (error as { status?: number })?.status;
  if (status === 401) return 'That Anthropic API key was rejected. Check it in AI settings.';
  if (status === 403) return 'That Anthropic API key lacks access to this model.';
  if (status === 429) return 'Rate limited by Anthropic. Wait a moment and try again.';
  if (status === 404) return 'That model is not available on this API key.';
  if (typeof status === 'number' && status >= 500) {
    return 'Anthropic had a server error. Try again shortly.';
  }
  const message = (error as { message?: string })?.message;
  if (message?.includes('Failed to fetch') || message?.includes('NetworkError')) {
    return 'Could not reach Anthropic — check your connection.';
  }
  return message ? `Copy generation failed: ${message}` : 'Copy generation failed.';
}
