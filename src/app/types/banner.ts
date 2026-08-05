export interface BannerFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'square' | 'horizontal' | 'vertical';
  aspectRatio: number; // width/height
}

export interface BannerContent {
  backgroundImage: string;
  backgroundPosition: string;
  shapes: ShapeElement[]; // NEW: Geometric shapes
  images: ImageElement[]; // Extra raster images
  texts: TextElement[];
  logo: string;
  logoSize: number;
  logoPosition:
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'center'; // Deprecated - for compatibility
  logoBackgroundEnabled: boolean;
  logoBackgroundColor: string;
  logoBackgroundOpacity: number;
  // Logo positioning and transform - NEW
  logoX?: number; // Position in pixels from left
  logoY?: number; // Position in pixels from top
  logoWidth?: number; // Width in pixels (if not set, auto from logoSize)
  logoHeight?: number; // Height in pixels (if not set, auto from logoSize)
  logoRotation?: number; // Rotation in degrees
  ctas: CTA[];
  ctaSize: number;
  ctaPosition: 'top' | 'bottom' | 'center' | 'left' | 'right'; // Deprecated - for compatibility
  // CTA group free positioning (overrides ctaPosition when set)
  ctaGroupX?: number; // Position in pixels from left
  ctaGroupY?: number; // Position in pixels from top
  // Common CTA styles
  ctaBgColor: string;
  ctaTextColor: string;
  ctaButtonType: 'solid' | 'outline' | 'ghost';
  ctaGradient: {
    enabled: boolean;
    from: string;
    to: string;
    direction: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl';
  };
  ctaShadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  ctaBorderRadius: number;
  ctaBorderWidth: number;
  // Manual element groups
  groups?: ElementGroup[];
}

export interface ShapeElement {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'polygon';
  color: string;
  opacity: number; // 0-100

  /** When true, SmartLayout stretches this shape to fill the entire banner (x=0, y=0, width=W, height=H) */
  isBackground?: boolean;

  // Absolute positioning and transform
  x?: number; // Position in pixels from left
  y?: number; // Position in pixels from top
  width?: number; // Width in pixels
  height?: number; // Height in pixels
  rotation?: number; // Rotation in degrees

  // For polygon type (future enhancement)
  points?: string; // SVG polygon points
}

export interface ImageElement {
  id: string;
  src: string; // base64 data-URL or remote URL
  x: number; // Position in pixels from left
  y: number; // Position in pixels from top
  width: number; // Width in pixels
  height: number; // Height in pixels
  rotation?: number; // Rotation in degrees
  opacity: number; // 0-100

  /** When true, SmartLayout stretches this image to fill the entire banner (x=0, y=0, width=W, height=H) */
  isBackground?: boolean;
}

export interface TextElement {
  id: string;
  text: string;
  fontSize: number;
  fontFamily?: string;
  color: string;
  /** @deprecated — texts always render with transparent background. Use a Shape element behind text instead. Kept for backward compat. */
  bgColor: string;
  /** @deprecated — texts always render with transparent background. Use a Shape element behind text instead. Kept for backward compat. */
  bgOpacity: number;
  position: 'top' | 'center' | 'bottom'; // Deprecated - mantener por compatibilidad
  bgStyle: 'full-width' | 'inline';

  // Absolute positioning and transform - NEW
  x?: number; // Position in pixels from left
  y?: number; // Position in pixels from top
  width?: number; // Width in pixels (if not set, auto from content)
  height?: number; // Height in pixels (if not set, auto from content)
  rotation?: number; // Rotation in degrees

  // Rich text formatting
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';

  // Alignment
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';

  // Spacing
  lineHeight?: number; // percentage: 100 = normal, 150 = 1.5x
  letterSpacing?: number; // pixels

  // Padding
  paddingX?: number; // horizontal padding in pixels
  paddingY?: number; // vertical padding in pixels

  // Advanced
  listStyle?: 'none' | 'bullet' | 'numbered';

  /**
   * Auto contrast: when not explicitly false, the engine samples the
   * background under this text and adapts color/weight/size for readability.
   * Set to false automatically when the user picks a manual color.
   */
  autoContrast?: boolean;
  baseline?: 'normal' | 'superscript' | 'subscript';
}

export interface CTA {
  id: string;
  text: string;

  // Absolute positioning and transform - NEW
  x?: number; // Position in pixels from left
  y?: number; // Position in pixels from top
  width?: number; // Width in pixels (if not set, auto from content)
  height?: number; // Height in pixels (if not set, auto from content)
  rotation?: number; // Rotation in degrees

  // Advanced styling (individual per CTA)
  fontFamily?: string;
  fontWeight?: number; // 400, 700, 900, etc.
  fontSize?: number; // relative to base CTA size
  letterSpacing?: number; // in pixels
  textShadow?: string; // CSS text-shadow value
  borderRadius?: number; // specific border radius for this CTA

  // Individual CTA colors and effects (override global settings)
  bgColor?: string; // background color
  textColor?: string; // text color
  borderColor?: string; // border color
  borderWidth?: number; // border width in pixels
  variant?: 'solid' | 'outline' | 'ghost'; // button variant

  // Individual gradient (overrides global)
  gradient?: {
    enabled: boolean;
    from: string;
    to: string;
    direction: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl';
  };

  // Individual shadow (overrides global)
  shadow?: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT GROUPS
// Manual grouping of elements. A group is a REAL DOM container positioned
// absolutely on the canvas. Member elements use positions relative to the
// group's top-left corner. This guarantees that html2canvas captures the
// group as an atomic block — no displacement between members on export.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ElementGroup {
  id: string;
  name: string;
  /** Element ids belonging to this group (text-xxx, shape-xxx, or 'logo') */
  memberIds: string[];
  /** Absolute position of the group container on the canvas (pixels) */
  x: number;
  y: number;
  /** Bounding-box dimensions of the group container (pixels) */
  width: number;
  height: number;
}

// Selected element types
export type SelectedElement =
  | { type: 'background' }
  | { type: 'logo' }
  | { type: 'shape'; id: string; index: number }
  | { type: 'image'; id: string; index: number }
  | { type: 'text'; id: string; index: number }
  | { type: 'cta'; id: string; index: number }
  | { type: 'cta-group' } // For global CTA settings
  | { type: 'group'; id: string } // Manual element group
  | null;

export interface BannerColumn {
  id: string;
  category: 'square' | 'horizontal' | 'vertical';
  masterFormat: BannerFormat;
  childFormats: BannerFormat[];
}

// Predefined formats grouped by aspect ratio category
// SQUARE: aspectRatio = 1 (width = height)
// HORIZONTAL: aspectRatio > 1 (width > height)
// VERTICAL: aspectRatio < 1 (width < height)

export const SQUARE_FORMATS: BannerFormat[] = [
  {
    id: 'sq-1200',
    name: 'Facebook Square Post',
    width: 1200,
    height: 1200,
    category: 'square',
    aspectRatio: 1,
  },
  {
    id: 'sq-1080',
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    category: 'square',
    aspectRatio: 1,
  },
  { id: 'sq-800', name: 'Logo', width: 800, height: 800, category: 'square', aspectRatio: 1 },
  { id: 'sq-250', name: 'Square', width: 250, height: 250, category: 'square', aspectRatio: 1 },
  {
    id: 'sq-200',
    name: 'Small Square',
    width: 200,
    height: 200,
    category: 'square',
    aspectRatio: 1,
  },
];

export const HORIZONTAL_FORMATS: BannerFormat[] = [
  // Wide Display Ads (ratio > 5)
  {
    id: 'hz-970x90',
    name: 'Large Leaderboard',
    width: 970,
    height: 90,
    category: 'horizontal',
    aspectRatio: 10.78,
  },
  {
    id: 'hz-728x90',
    name: 'Leaderboard',
    width: 728,
    height: 90,
    category: 'horizontal',
    aspectRatio: 8.09,
  },
  {
    id: 'hz-980x120',
    name: 'Panorama',
    width: 980,
    height: 120,
    category: 'horizontal',
    aspectRatio: 8.17,
  },
  {
    id: 'hz-468x60',
    name: 'Main Banner',
    width: 468,
    height: 60,
    category: 'horizontal',
    aspectRatio: 7.8,
  },
  {
    id: 'hz-320x50',
    name: 'Mobile Leaderboard',
    width: 320,
    height: 50,
    category: 'horizontal',
    aspectRatio: 6.4,
  },
  {
    id: 'hz-300x50',
    name: 'Mobile Banner',
    width: 300,
    height: 50,
    category: 'horizontal',
    aspectRatio: 6,
  },
  {
    id: 'hz-930x180',
    name: 'Top Banner',
    width: 930,
    height: 180,
    category: 'horizontal',
    aspectRatio: 5.17,
  },
  {
    id: 'hz-234x60',
    name: 'Half Banner',
    width: 234,
    height: 60,
    category: 'horizontal',
    aspectRatio: 3.9,
  },
  {
    id: 'hz-970x250',
    name: 'Billboard',
    width: 970,
    height: 250,
    category: 'horizontal',
    aspectRatio: 3.88,
  },
  {
    id: 'hz-320x100',
    name: 'Large Mobile',
    width: 320,
    height: 100,
    category: 'horizontal',
    aspectRatio: 3.2,
  },
  {
    id: 'hz-1500x500',
    name: 'X Header',
    width: 1500,
    height: 500,
    category: 'horizontal',
    aspectRatio: 3,
  },

  // Social & Standard Horizontal (ratio 1.5 - 2.5)
  {
    id: 'hz-820x360',
    name: 'Facebook Cover',
    width: 820,
    height: 360,
    category: 'horizontal',
    aspectRatio: 2.28,
  },
  {
    id: 'hz-1200x600',
    name: 'X Image Post',
    width: 1200,
    height: 600,
    category: 'horizontal',
    aspectRatio: 2,
  },
  {
    id: 'hz-1200x628',
    name: 'Facebook Sponsored Message',
    width: 1200,
    height: 628,
    category: 'horizontal',
    aspectRatio: 1.91,
  },
  {
    id: 'hz-1920x1080',
    name: 'Full HD 16:9',
    width: 1920,
    height: 1080,
    category: 'horizontal',
    aspectRatio: 1.78,
  },
  {
    id: 'hz-580x400',
    name: 'Netboard',
    width: 580,
    height: 400,
    category: 'horizontal',
    aspectRatio: 1.45,
  },

  // Small Rectangles (ratio 1 - 1.5)
  {
    id: 'hz-336x280',
    name: 'Large Rectangle',
    width: 336,
    height: 280,
    category: 'horizontal',
    aspectRatio: 1.2,
  },
  {
    id: 'hz-300x250',
    name: 'Inline Rectangle',
    width: 300,
    height: 250,
    category: 'horizontal',
    aspectRatio: 1.2,
  },
  {
    id: 'hz-180x150',
    name: 'Small Rectangle',
    width: 180,
    height: 150,
    category: 'horizontal',
    aspectRatio: 1.2,
  },
];

export const VERTICAL_FORMATS: BannerFormat[] = [
  // Skyscrapers & Tall Banners (ratio < 0.5)
  {
    id: 'vt-120x600',
    name: 'Skyscraper',
    width: 120,
    height: 600,
    category: 'vertical',
    aspectRatio: 0.2,
  },
  {
    id: 'vt-300x1050',
    name: 'Portrait',
    width: 300,
    height: 1050,
    category: 'vertical',
    aspectRatio: 0.29,
  },
  {
    id: 'vt-160x600',
    name: 'Wide Skyscraper',
    width: 160,
    height: 600,
    category: 'vertical',
    aspectRatio: 0.27,
  },
  {
    id: 'vt-300x600',
    name: 'Half Page',
    width: 300,
    height: 600,
    category: 'vertical',
    aspectRatio: 0.5,
  },
  {
    id: 'vt-120x240',
    name: 'Vertical Banner',
    width: 120,
    height: 240,
    category: 'vertical',
    aspectRatio: 0.5,
  },

  // Stories & Social Vertical (ratio 0.5 - 0.8)
  {
    id: 'vt-1080x1920',
    name: 'Story',
    width: 1080,
    height: 1920,
    category: 'vertical',
    aspectRatio: 0.56,
  },
  {
    id: 'vt-240x400',
    name: 'Vertical Rectangle',
    width: 240,
    height: 400,
    category: 'vertical',
    aspectRatio: 0.6,
  },
  {
    id: 'vt-1000x1500',
    name: 'Pinterest Pin Tall',
    width: 1000,
    height: 1500,
    category: 'vertical',
    aspectRatio: 0.67,
  },
  {
    id: 'vt-250x360',
    name: 'Triple Widescreen',
    width: 250,
    height: 360,
    category: 'vertical',
    aspectRatio: 0.69,
  },
  {
    id: 'vt-1080x1350',
    name: 'Video in-feed Ad',
    width: 1080,
    height: 1350,
    category: 'vertical',
    aspectRatio: 0.8,
  },
];

export const DEFAULT_CONTENT: BannerContent = {
  backgroundImage:
    'https://images.unsplash.com/photo-1622131815379-476bbefa631c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2UlMjBsYXB0b3B8ZW58MXx8fHwxNzcwOTU3MTE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  backgroundPosition: 'center',
  shapes: [], // Empty by default - user can add shapes as needed
  images: [], // Empty by default - user can add extra images
  texts: [
    {
      id: 'text-1',
      text: 'Work flows better here',
      fontSize: 100,
      color: '#ffffff',
      bgColor: 'transparent',
      bgOpacity: 0,
      position: 'center',
      bgStyle: 'full-width',
    },
  ],
  logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=100&fit=crop',
  logoSize: 100,
  logoPosition: 'top-left',
  logoBackgroundEnabled: false,
  logoBackgroundColor: '#000000',
  logoBackgroundOpacity: 0,
  ctas: [
    {
      id: 'cta-1',
      text: 'Get Started',
    },
  ],
  ctaSize: 100,
  ctaPosition: 'bottom',
  ctaBgColor: '#FF6B35',
  ctaTextColor: '#FFFFFF',
  ctaButtonType: 'solid',
  ctaGradient: {
    enabled: true,
    from: '#FF6B35',
    to: '#FF6B35',
    direction: 'to-r',
  },
  ctaShadow: {
    enabled: true,
    color: '#000000',
    blur: 5,
    offsetX: 0,
    offsetY: 2,
  },
  ctaBorderRadius: 5,
  ctaBorderWidth: 0,
};
