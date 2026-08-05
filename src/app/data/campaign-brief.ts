import { BannerContent, DEFAULT_CONTENT } from '../types/banner';
import { CopyVariant } from '../services/ai/types';

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN BRIEF → BANNER CONTENT
// The wizard collects a brief; this turns it into a format-agnostic
// BannerContent (zone positions + a full-bleed scrim only), which
// startCampaign then lays out per format. Kept pure so it is testable.
// ═══════════════════════════════════════════════════════════════════════════

export const CAMPAIGN_OBJECTIVES = [
  'Drive signups',
  'Drive sales',
  'Promote an offer',
  'Build awareness',
  'Announce a launch',
  'Re-engage customers',
] as const;

export const CAMPAIGN_TONES = [
  'Confident',
  'Friendly',
  'Premium',
  'Playful',
  'Urgent',
  'Technical',
] as const;

export const BRAND_FONTS = [
  'Poppins',
  'Inter',
  'Montserrat',
  'Roboto',
  'Raleway',
  'Oswald',
  'Lato',
  'Open Sans',
] as const;

export interface CampaignBrand {
  logo: string;
  fontFamily: string;
  ctaBgColor: string;
  ctaTextColor: string;
  /** Optional AI- or user-supplied background image (data URL or remote URL) */
  backgroundImage: string;
  /** Darkening scrim over the background, 0–100 (keeps text readable) */
  scrimOpacity: number;
}

export const DEFAULT_BRAND: CampaignBrand = {
  logo: '',
  fontFamily: 'Poppins',
  ctaBgColor: '#2563eb',
  ctaTextColor: '#ffffff',
  backgroundImage: '',
  scrimOpacity: 35,
};

let uid = 0;
const nextId = (prefix: string) => `${prefix}-camp-${Date.now()}-${++uid}`;

/**
 * Compose the campaign's master design. Text colors are left to the
 * auto-contrast engine (autoContrast defaults on), which samples the real
 * background of each banner after layout.
 */
export function buildCampaignContent(copy: CopyVariant, brand: CampaignBrand): BannerContent {
  const texts: BannerContent['texts'] = [
    {
      id: nextId('text'),
      text: copy.headline,
      fontSize: 120,
      fontFamily: brand.fontFamily,
      fontWeight: 'bold',
      color: '#ffffff',
      bgColor: 'transparent',
      bgOpacity: 0,
      position: 'center',
      bgStyle: 'full-width',
    },
  ];

  if (copy.subheadline.trim()) {
    texts.push({
      id: nextId('text'),
      text: copy.subheadline,
      fontSize: 60,
      fontFamily: brand.fontFamily,
      color: '#ffffff',
      bgColor: 'transparent',
      bgOpacity: 0,
      position: 'center',
      bgStyle: 'full-width',
    });
  }

  // A full-bleed scrim only makes sense over a photo background.
  const shapes: BannerContent['shapes'] =
    brand.backgroundImage && brand.scrimOpacity > 0
      ? [
          {
            id: nextId('shape'),
            type: 'rectangle',
            color: '#0f172a',
            opacity: brand.scrimOpacity,
            isBackground: true,
          },
        ]
      : [];

  return {
    ...DEFAULT_CONTENT,
    backgroundImage: brand.backgroundImage,
    backgroundPosition: 'center',
    shapes,
    images: [],
    texts,
    logo: brand.logo,
    logoSize: 100,
    logoPosition: 'top-left',
    logoBackgroundEnabled: false,
    logoBackgroundColor: '#000000',
    logoBackgroundOpacity: 0,
    // Drop any inherited absolute logo placement so the layout engine decides
    logoX: undefined,
    logoY: undefined,
    logoWidth: undefined,
    logoHeight: undefined,
    ctas: [{ id: nextId('cta'), text: copy.cta }],
    ctaPosition: 'bottom',
    ctaGroupX: undefined,
    ctaGroupY: undefined,
    ctaBgColor: brand.ctaBgColor,
    ctaTextColor: brand.ctaTextColor,
    ctaButtonType: 'solid',
    ctaGradient: {
      enabled: false,
      from: brand.ctaBgColor,
      to: brand.ctaBgColor,
      direction: 'to-r',
    },
    ctaShadow: { enabled: true, color: '#000000', blur: 6, offsetX: 0, offsetY: 2 },
    ctaBorderRadius: 8,
    ctaBorderWidth: 0,
    groups: undefined,
  };
}
