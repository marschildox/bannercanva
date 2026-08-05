import { BannerContent } from '../types/banner';

// ═══════════════════════════════════════════════════════════════════════════
// BANNER TEMPLATES
// Curated starting designs. Templates are FORMAT-AGNOSTIC: they only use
// zone positions (top/center/bottom) and full-bleed background shapes —
// never absolute coordinates — so the same template lays out correctly on a
// 250x250 square, a 970x90 leaderboard or a 1080x1920 story, and the
// master→child propagation adapts it to every banner on the board.
// Text colors lean on the auto-contrast engine (autoContrast defaults on).
// ═══════════════════════════════════════════════════════════════════════════

export interface BannerTemplate {
  id: string;
  name: string;
  description: string;
  /** Simplified visual identity used by the panel's CSS preview card */
  preview: {
    /** CSS background shorthand (color, gradient or none) */
    background: string;
    /** Preview photo (rendered under `background` when provided) */
    image?: string;
    headline: string;
    headlineColor: string;
    ctaLabel: string;
    ctaBackground: string;
    ctaColor: string;
  };
  /** Build a fresh BannerContent — ids are unique per invocation */
  build: () => BannerContent;
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1080&q=80&fit=crop`;

let uid = 0;
const nextId = (prefix: string) => `${prefix}-tpl-${Date.now()}-${++uid}`;

/** Shared skeleton with sane defaults; each template overrides on top */
function base(): BannerContent {
  return {
    backgroundImage: '',
    backgroundPosition: 'center',
    shapes: [],
    images: [],
    texts: [],
    logo: '',
    logoSize: 100,
    logoPosition: 'top-left',
    logoBackgroundEnabled: false,
    logoBackgroundColor: '#000000',
    logoBackgroundOpacity: 0,
    ctas: [],
    ctaSize: 100,
    ctaPosition: 'bottom',
    ctaBgColor: '#2563eb',
    ctaTextColor: '#ffffff',
    ctaButtonType: 'solid',
    ctaGradient: { enabled: false, from: '#2563eb', to: '#1d4ed8', direction: 'to-r' },
    ctaShadow: { enabled: true, color: '#000000', blur: 6, offsetX: 0, offsetY: 2 },
    ctaBorderRadius: 8,
    ctaBorderWidth: 0,
  };
}

function text(
  content: string,
  overrides: Partial<BannerContent['texts'][number]> = {},
): BannerContent['texts'][number] {
  return {
    id: nextId('text'),
    text: content,
    fontSize: 100,
    color: '#ffffff',
    bgColor: 'transparent',
    bgOpacity: 0,
    position: 'center',
    bgStyle: 'full-width',
    ...overrides,
  };
}

function scrim(color: string, opacity: number): BannerContent['shapes'][number] {
  return {
    id: nextId('shape'),
    type: 'rectangle',
    color,
    opacity,
    isBackground: true,
  };
}

export const BANNER_TEMPLATES: BannerTemplate[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Photo hero with dark scrim and a strong call to action',
    preview: {
      background: 'rgba(15, 23, 42, 0.45)',
      image: unsplash('1497366216548-37526070297c'),
      headline: 'Meet the new standard',
      headlineColor: '#ffffff',
      ctaLabel: 'Discover',
      ctaBackground: '#f97316',
      ctaColor: '#ffffff',
    },
    build: () => ({
      ...base(),
      backgroundImage: unsplash('1497366216548-37526070297c'),
      shapes: [scrim('#0f172a', 45)],
      texts: [
        text('Meet the new standard', { fontSize: 120, fontWeight: 'bold', position: 'center' }),
        text('Available now — free 30-day trial', { fontSize: 60, position: 'center' }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Discover' }],
      ctaBgColor: '#f97316',
      ctaGradient: { enabled: true, from: '#f97316', to: '#ea580c', direction: 'to-r' },
      ctaBorderRadius: 8,
    }),
  },
  {
    id: 'bold-sale',
    name: 'Bold Sale',
    description: 'High-impact flat color for promotions and discounts',
    preview: {
      background: '#dc2626',
      headline: 'MEGA SALE −50%',
      headlineColor: '#ffffff',
      ctaLabel: 'Shop Now',
      ctaBackground: '#111827',
      ctaColor: '#ffffff',
    },
    build: () => ({
      ...base(),
      shapes: [scrim('#dc2626', 100)],
      texts: [
        text('MEGA SALE −50%', {
          fontSize: 140,
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 1,
          position: 'center',
        }),
        text('Only this week', { fontSize: 60, position: 'center' }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Shop Now' }],
      ctaBgColor: '#111827',
      ctaShadow: { enabled: true, color: '#7f1d1d', blur: 10, offsetX: 0, offsetY: 4 },
      ctaBorderRadius: 999,
    }),
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Clean canvas, dark type, outline button',
    preview: {
      background: '#f8fafc',
      headline: 'Less, but better',
      headlineColor: '#111827',
      ctaLabel: 'Learn More',
      ctaBackground: 'transparent',
      ctaColor: '#111827',
    },
    build: () => ({
      ...base(),
      shapes: [scrim('#f8fafc', 100)],
      texts: [
        text('Less, but better', {
          fontSize: 120,
          color: '#111827',
          fontFamily: 'Inter',
          position: 'center',
        }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Learn More' }],
      ctaButtonType: 'outline',
      ctaBgColor: '#111827',
      ctaTextColor: '#111827',
      ctaBorderWidth: 2,
      ctaBorderRadius: 4,
      ctaShadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
    }),
  },
  {
    id: 'elegant-dark',
    name: 'Elegant Dark',
    description: 'Near-black canvas with a golden accent',
    preview: {
      background: '#0b1220',
      headline: 'Timeless Elegance',
      headlineColor: '#e5d5a1',
      ctaLabel: 'Explore',
      ctaBackground: '#d4af37',
      ctaColor: '#0b1220',
    },
    build: () => ({
      ...base(),
      shapes: [scrim('#0b1220', 100)],
      texts: [
        text('Timeless Elegance', {
          fontSize: 120,
          color: '#e5d5a1',
          fontFamily: 'Raleway',
          letterSpacing: 2,
          position: 'center',
          autoContrast: false, // deliberate gold palette
        }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Explore' }],
      ctaBgColor: '#d4af37',
      ctaTextColor: '#0b1220',
      ctaBorderRadius: 0,
    }),
  },
  {
    id: 'tech-gradient',
    name: 'Tech',
    description: 'Deep indigo tech backdrop with electric accent',
    preview: {
      background: 'rgba(49, 46, 129, 0.72)',
      image: unsplash('1518770660439-4636190af475'),
      headline: 'Build the future',
      headlineColor: '#ffffff',
      ctaLabel: 'Start Free',
      ctaBackground: '#22d3ee',
      ctaColor: '#0e7490',
    },
    build: () => ({
      ...base(),
      backgroundImage: unsplash('1518770660439-4636190af475'),
      shapes: [scrim('#312e81', 72)],
      texts: [
        text('Build the future', { fontSize: 130, fontWeight: 'bold', position: 'center' }),
        text('Developer-first platform', { fontSize: 60, position: 'center' }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Start Free' }],
      ctaBgColor: '#22d3ee',
      ctaTextColor: '#164e63',
      ctaGradient: { enabled: true, from: '#22d3ee', to: '#0ea5e9', direction: 'to-br' },
      ctaBorderRadius: 8,
    }),
  },
  {
    id: 'eco-nature',
    name: 'Eco / Nature',
    description: 'Forest photo with an organic green accent',
    preview: {
      background: 'rgba(6, 78, 59, 0.35)',
      image: unsplash('1441974231531-c6227db76b6e'),
      headline: 'Go green today',
      headlineColor: '#ffffff',
      ctaLabel: 'Join Us',
      ctaBackground: '#16a34a',
      ctaColor: '#ffffff',
    },
    build: () => ({
      ...base(),
      backgroundImage: unsplash('1441974231531-c6227db76b6e'),
      shapes: [scrim('#064e3b', 35)],
      texts: [
        text('Go green today', { fontSize: 120, fontWeight: 'semibold', position: 'center' }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Join Us' }],
      ctaBgColor: '#16a34a',
      ctaBorderRadius: 999,
    }),
  },
  {
    id: 'food-appetite',
    name: 'Food',
    description: 'Appetizing photo with a warm bottom scrim',
    preview: {
      background: 'rgba(24, 8, 2, 0.35)',
      image: unsplash('1504674900247-0877df9cc836'),
      headline: 'Taste the difference',
      headlineColor: '#ffffff',
      ctaLabel: 'Order Now',
      ctaBackground: '#ef4444',
      ctaColor: '#ffffff',
    },
    build: () => ({
      ...base(),
      backgroundImage: unsplash('1504674900247-0877df9cc836'),
      shapes: [scrim('#180802', 35)],
      texts: [
        text('Taste the difference', { fontSize: 120, fontWeight: 'bold', position: 'bottom' }),
      ],
      ctas: [{ id: nextId('cta'), text: 'Order Now' }],
      ctaBgColor: '#ef4444',
      ctaGradient: { enabled: true, from: '#ef4444', to: '#dc2626', direction: 'to-b' },
      ctaBorderRadius: 12,
    }),
  },
  {
    id: 'fashion-editorial',
    name: 'Fashion',
    description: 'Editorial photo, airy uppercase type, ghost button',
    preview: {
      background: 'rgba(0, 0, 0, 0.25)',
      image: unsplash('1490481651871-ab68de25d43d'),
      headline: 'NEW COLLECTION',
      headlineColor: '#ffffff',
      ctaLabel: 'View Lookbook',
      ctaBackground: 'rgba(255,255,255,0.18)',
      ctaColor: '#ffffff',
    },
    build: () => ({
      ...base(),
      backgroundImage: unsplash('1490481651871-ab68de25d43d'),
      shapes: [scrim('#000000', 25)],
      texts: [
        text('NEW COLLECTION', {
          fontSize: 110,
          fontFamily: 'Oswald',
          textTransform: 'uppercase',
          letterSpacing: 4,
          position: 'top',
        }),
      ],
      ctas: [{ id: nextId('cta'), text: 'View Lookbook' }],
      ctaButtonType: 'ghost',
      ctaBgColor: '#ffffff',
      ctaTextColor: '#ffffff',
      ctaBorderRadius: 0,
      ctaShadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
    }),
  },
];
