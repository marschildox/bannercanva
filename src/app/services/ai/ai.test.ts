import { describe, it, expect, beforeEach } from 'vitest';
import { buildCopyPrompt, parseCopyResponse, extractText, describeProviderError } from './copy';
import { parseGeminiImageResponse, buildImagePrompt, aspectRatioLabel } from './image';
import { loadAiSettings, saveAiSettings, clearAiSettings, maskKey } from './settings';
import { AiError, CopyBrief } from './types';

const brief: CopyBrief = {
  product: 'Standing desk',
  objective: 'Drive trial signups',
  tone: 'Confident',
  variants: 2,
};

describe('copy prompt', () => {
  it('includes the brief and the requested variant count', () => {
    const prompt = buildCopyPrompt({
      ...brief,
      audience: 'Remote workers',
      notes: 'Mention 30-day returns',
    });
    expect(prompt).toContain('Standing desk');
    expect(prompt).toContain('Drive trial signups');
    expect(prompt).toContain('Remote workers');
    expect(prompt).toContain('Mention 30-day returns');
    expect(prompt).toContain('exactly 2 distinct variants');
  });

  it('omits optional fields when empty', () => {
    const prompt = buildCopyPrompt({ ...brief, audience: '   ', notes: '' });
    expect(prompt).not.toContain('Audience:');
    expect(prompt).not.toContain('Additional constraints:');
  });
});

describe('parseCopyResponse', () => {
  const valid = JSON.stringify({
    variants: [
      { headline: '  Work standing  ', subheadline: 'Ship more before lunch', cta: ' Try free ' },
      { headline: 'Sit less', subheadline: 'Adjustable in one tap', cta: 'See desks' },
    ],
  });

  it('parses and trims variants', () => {
    const variants = parseCopyResponse(valid, 2);
    expect(variants).toHaveLength(2);
    expect(variants[0]).toEqual({
      headline: 'Work standing',
      subheadline: 'Ship more before lunch',
      cta: 'Try free',
    });
  });

  it('trims down when the model over-delivers', () => {
    expect(parseCopyResponse(valid, 1)).toHaveLength(1);
  });

  it('skips variants with missing or blank fields', () => {
    const partial = JSON.stringify({
      variants: [
        { headline: 'Good', subheadline: 'Fine', cta: 'Go' },
        { headline: '', subheadline: 'no headline', cta: 'Go' },
        { headline: 'No cta', subheadline: 'x' },
      ],
    });
    expect(parseCopyResponse(partial, 3)).toHaveLength(1);
  });

  it('throws AiError on unusable payloads', () => {
    expect(() => parseCopyResponse('not json', 1)).toThrow(AiError);
    expect(() => parseCopyResponse('{}', 1)).toThrow(AiError);
    expect(() => parseCopyResponse('{"variants":[]}', 1)).toThrow(AiError);
    expect(() => parseCopyResponse('{"variants":[{"headline":1}]}', 1)).toThrow(AiError);
  });
});

describe('extractText', () => {
  it('concatenates only text blocks', () => {
    expect(
      extractText([
        { type: 'thinking' },
        { type: 'text', text: '{"variants":' },
        { type: 'text', text: '[]}' },
      ]),
    ).toBe('{"variants":[]}');
  });
});

describe('describeProviderError', () => {
  it('maps HTTP statuses to actionable messages', () => {
    expect(describeProviderError({ status: 401 })).toMatch(/key was rejected/);
    expect(describeProviderError({ status: 429 })).toMatch(/Rate limited/);
    expect(describeProviderError({ status: 503 })).toMatch(/server error/);
    expect(describeProviderError({ message: 'Failed to fetch' })).toMatch(/connection/);
  });
});

describe('parseGeminiImageResponse', () => {
  it('returns a data URL from camelCase inlineData', () => {
    const url = parseGeminiImageResponse({
      candidates: [
        {
          content: {
            parts: [
              { text: 'Here you go' },
              { inlineData: { mimeType: 'image/png', data: 'AAAA' } },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    });
    expect(url).toBe('data:image/png;base64,AAAA');
  });

  it('also accepts snake_case inline_data and defaults the mime type', () => {
    const url = parseGeminiImageResponse({
      candidates: [{ content: { parts: [{ inline_data: { data: 'BBBB' } }] } }],
    });
    expect(url).toBe('data:image/png;base64,BBBB');
  });

  it('surfaces a blocked prompt', () => {
    expect(() => parseGeminiImageResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(
      /blocked that prompt \(SAFETY\)/,
    );
  });

  it('surfaces a provider error message', () => {
    expect(() => parseGeminiImageResponse({ error: { message: 'API key invalid' } })).toThrow(
      /API key invalid/,
    );
  });

  it('surfaces a non-STOP finish reason when no image came back', () => {
    expect(() =>
      parseGeminiImageResponse({
        candidates: [{ content: { parts: [] }, finishReason: 'SAFETY' }],
      }),
    ).toThrow(/stopped without an image \(SAFETY\)/);
  });

  it('throws when the reply is text only', () => {
    expect(() =>
      parseGeminiImageResponse({
        candidates: [{ content: { parts: [{ text: 'I cannot' }] }, finishReason: 'STOP' }],
      }),
    ).toThrow(/no image/);
  });
});

describe('image prompt and aspect ratio', () => {
  it('always forbids text in the generated image', () => {
    const prompt = buildImagePrompt({ prompt: 'sunlit office', aspectRatio: '1:1' });
    expect(prompt).toContain('sunlit office');
    expect(prompt).toContain('1:1 aspect ratio');
    expect(prompt).toMatch(/no text/i);
  });

  it('maps banner dimensions to the closest ratio label', () => {
    expect(aspectRatioLabel(250, 250)).toBe('1:1');
    expect(aspectRatioLabel(1080, 1920)).toBe('9:16');
    expect(aspectRatioLabel(1920, 1080)).toBe('16:9');
    expect(aspectRatioLabel(970, 90)).toBe('3:1');
    expect(aspectRatioLabel(1080, 1350)).toBe('4:5');
  });
});

describe('ai settings', () => {
  beforeEach(() => localStorage.clear());

  it('defaults cleanly when nothing is stored', () => {
    const settings = loadAiSettings();
    expect(settings.anthropicApiKey).toBe('');
    expect(settings.copyModel).toBe('claude-opus-5');
  });

  it('round-trips and trims keys', () => {
    saveAiSettings({
      anthropicApiKey: '  sk-ant-abc123  ',
      geminiApiKey: 'g-key',
      copyModel: 'claude-sonnet-5',
    });
    const loaded = loadAiSettings();
    expect(loaded.anthropicApiKey).toBe('sk-ant-abc123');
    expect(loaded.copyModel).toBe('claude-sonnet-5');
  });

  it('falls back to a valid model when the stored one is unknown', () => {
    localStorage.setItem(
      'bannercanva-ai-settings-v1',
      JSON.stringify({ copyModel: 'gpt-4', anthropicApiKey: 'x' }),
    );
    expect(loadAiSettings().copyModel).toBe('claude-opus-5');
  });

  it('survives corrupted storage and clears', () => {
    localStorage.setItem('bannercanva-ai-settings-v1', 'not json');
    expect(loadAiSettings().anthropicApiKey).toBe('');
    saveAiSettings({ anthropicApiKey: 'k', geminiApiKey: '', copyModel: 'claude-opus-5' });
    clearAiSettings();
    expect(loadAiSettings().anthropicApiKey).toBe('');
  });

  it('masks keys for display', () => {
    expect(maskKey('')).toBe('');
    expect(maskKey('short')).toBe('••••');
    expect(maskKey('sk-ant-api03-XYZ9')).toMatch(/XYZ9$/);
  });
});
