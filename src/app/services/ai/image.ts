import { AiError, ImageBrief } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND IMAGE GENERATION (Google Gemini, direct REST)
// Called straight from the browser with the user's own key — no gateway.
// The response parser is exported separately so its failure modes (blocked
// prompt, text-only reply, snake_case vs camelCase payloads) are testable.
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

export function buildImagePrompt(brief: ImageBrief): string {
  return [
    `Generate a high-quality background image for a marketing banner: ${brief.prompt.trim()}.`,
    `Compose it for a ${brief.aspectRatio} aspect ratio.`,
    'Leave calm, uncluttered areas where headline text and a button will be placed on top.',
    'Professional, vivid, photographic or cleanly illustrated.',
    'Absolutely no text, no words, no letters, no logos and no watermarks in the image.',
  ].join(' ');
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; mime_type?: string; data?: string };
  inline_data?: { mimeType?: string; mime_type?: string; data?: string };
}

/**
 * Pull the first inline image out of a Gemini generateContent response and
 * return it as a data URL. Throws AiError with an actionable message when the
 * response carries no image (safety block, quota, text-only answer).
 */
export function parseGeminiImageResponse(payload: unknown): string {
  const body = payload as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };

  if (body?.error?.message) {
    throw new AiError(`Gemini rejected the request: ${body.error.message}`);
  }
  if (body?.promptFeedback?.blockReason) {
    throw new AiError(
      `Gemini blocked that prompt (${body.promptFeedback.blockReason}). Try describing the scene differently.`,
    );
  }

  const candidates = body?.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts ?? []) {
      // The REST API has used both camelCase and snake_case for this field.
      const inline = part.inlineData ?? part.inline_data;
      const data = inline?.data;
      if (typeof data === 'string' && data.length > 0) {
        const mime = inline?.mimeType ?? inline?.mime_type ?? 'image/png';
        return `data:${mime};base64,${data}`;
      }
    }
  }

  const blockedCandidate = candidates.find(
    (c) => c.finishReason && c.finishReason !== 'STOP' && c.finishReason !== 'MAX_TOKENS',
  );
  if (blockedCandidate) {
    throw new AiError(
      `Gemini stopped without an image (${blockedCandidate.finishReason}). Try a different description.`,
    );
  }

  throw new AiError('Gemini returned no image for that prompt. Try describing the scene again.');
}

export async function generateBackgroundImage(brief: ImageBrief, apiKey: string): Promise<string> {
  if (!apiKey.trim()) {
    throw new AiError('Add a Google Gemini API key in AI settings to generate backgrounds.');
  }
  if (!brief.prompt.trim()) {
    throw new AiError('Describe the background you want first.');
  }

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildImagePrompt(brief) }] }],
      }),
    });
  } catch (error) {
    throw new AiError('Could not reach Gemini — check your connection.', error);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* fall through to the status-based message below */
  }

  if (!response.ok) {
    const providerMessage = (payload as { error?: { message?: string } })?.error?.message;
    if (response.status === 400 && providerMessage) {
      throw new AiError(`Gemini rejected the request: ${providerMessage}`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiError('That Gemini API key was rejected. Check it in AI settings.');
    }
    if (response.status === 429) {
      throw new AiError('Rate limited by Gemini. Wait a moment and try again.');
    }
    if (response.status >= 500) {
      throw new AiError('Gemini had a server error. Try again shortly.');
    }
    throw new AiError(providerMessage ?? `Gemini request failed (HTTP ${response.status}).`);
  }

  return parseGeminiImageResponse(payload);
}

/** Closest supported ratio label for a banner format, used to steer composition. */
export function aspectRatioLabel(width: number, height: number): string {
  const ratio = width / height;
  const options: Array<[string, number]> = [
    ['1:1', 1],
    ['4:5', 0.8],
    ['9:16', 0.5625],
    ['4:3', 4 / 3],
    ['16:9', 16 / 9],
    ['3:1', 3],
  ];
  let best = options[0];
  for (const option of options) {
    if (Math.abs(option[1] - ratio) < Math.abs(best[1] - ratio)) best = option;
  }
  return best[0];
}
