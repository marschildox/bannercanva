# Banner Generator - Architecture Documentation

## 📐 System Overview

The Banner Generator is a professional tool for creating multiple banner formats from a single master design. It supports automatic propagation of changes across related banners and comprehensive export capabilities.

## 🏗️ Architecture

### Core Principles

1. **Master-Child Hierarchy**: Changes propagate from master to children
2. **Super Master Pattern**: The first 1:1 square banner controls all other banners
3. **Modular Components**: Separation of concerns with hooks, utilities, and components
4. **Export-First Design**: Prioritized bulk export capabilities with ZIP packaging

### Directory Structure

```
/src/app
├── /hooks
│   ├── useBannerManager.ts    # Business logic for banner/column management
│   └── useBannerExport.ts     # Export functionality (PNG, ZIP)
├── /components
│   ├── BannerColumn.tsx       # Column container with master + children
│   ├── BannerCanvas.tsx       # Individual banner renderer
│   ├── BannerEditor.tsx       # Sidebar editor (Content/Style/Layout tabs)
│   ├── TextEditor.tsx         # Individual text element editor
│   ├── CTAEditor.tsx          # Individual CTA editor
│   └── ExportToolbar.tsx      # Export controls and progress
├── /types
│   └── banner.ts              # TypeScript interfaces and constants
└── App.tsx                    # Main application orchestrator
```

## 🔄 Data Flow

### State Management

The `useBannerManager` hook manages all application state:

- **columns**: Array of BannerColumn (category, master, children)
- **bannerContents**: Map<formatId, BannerContent>
- **selectedFormat**: Currently selected banner for editing

### Propagation Rules

1. **Super Master** (1st Square Banner):
   - Changes propagate to ALL banners across ALL columns
   - One-way propagation (unidirectional)

2. **Column Masters** (1st banner in each column):
   - Changes propagate only to children in same column
   - Do not affect other columns

3. **Child Banners**:
   - Changes affect only themselves
   - Receive updates from their column master

## 🎨 Component Architecture

### BannerCanvas

Renders individual banners with:
- Scaled canvas (zoom support)
- Unique ID for html2canvas export
- Hover controls (Edit, Delete)
- Master badge indicators

### BannerEditor

Three-tab sidebar editor:
- **Content**: Background, Logo, Texts, CTAs
- **Style**: Logo styles, Text styles, CTA styles (gradients, shadows)
- **Layout**: Position controls for all elements

### ExportToolbar

Provides export options:
- Single banner export (PNG)
- Column export (ZIP)
- Full set export (ZIP)
- Progress indicators

## 📦 Export System

### Technologies

- **html2canvas**: Converts DOM elements to canvas
- **jszip**: Packages multiple files into ZIP archives

### Export Flow

1. User clicks export button
2. `useBannerExport` hook captures banner via ID
3. html2canvas renders at 2x scale for quality
4. Converts to Blob (PNG/JPG)
5. Downloads directly or adds to ZIP
6. For bulk exports, sequential processing with delays to avoid browser overload

### Filename Convention

```
{BannerName}_{Width}x{Height}.png
```

Examples:
- `Instagram_Post_1080x1080.png`
- `Facebook_Post_1200x628.png`
- `Wide_Skyscraper_160x600.png`

## 🎯 Key Features

### 1. Multi-Format Support

- **Square**: Instagram posts, generic squares
- **Horizontal**: Facebook, Twitter, Google Ads leaderboards
- **Vertical**: Instagram stories, Pinterest pins, skyscrapers

### 2. Dynamic Scaling

- Real-size rendering (no distortion)
- Zoom controls (25% - 100%)
- Responsive element sizing based on banner dimensions

### 3. Advanced Styling

- **CTA Buttons**: Gradients, shadows, border radius, 3 types (solid/outline/ghost)
- **Text Elements**: Multiple texts, custom colors, backgrounds, opacity
- **Logo**: Variable sizing (50%-400%), optional background

### 4. Propagation System

- Super Master: Controls all banners globally
- Column Masters: Control children within column
- Automatic content inheritance

## 🚀 Performance Optimizations

1. **Map-based Content Storage**: O(1) lookups instead of array searches
2. **Sequential Export**: Prevents browser crashes on large exports
3. **Dynamic Import**: JSZip loaded only when needed
4. **Memoized Callbacks**: Prevent unnecessary re-renders

## 🔮 Scalability

### Adding New Formats

```typescript
// In /src/app/types/banner.ts
export const NEW_CATEGORY_FORMATS: BannerFormat[] = [
  { 
    id: 'custom-1', 
    name: 'Custom Format', 
    width: 800, 
    height: 600, 
    category: 'custom', 
    aspectRatio: 4/3 
  },
];
```

### Adding New Style Properties

1. Update `BannerContent` interface in `types/banner.ts`
2. Add controls in `BannerEditor.tsx` (appropriate tab)
3. Implement rendering in `BannerCanvas.tsx`
4. Update `DEFAULT_CONTENT` with default values

### Adding New Export Formats

```typescript
// In useBannerExport.ts
const exportAsWebP = async (bannerId: string, format: BannerFormat) => {
  // Implementation
};
```

## 📝 Best Practices

1. **Always use hooks**: Keep business logic in `useBannerManager`, `useBannerExport`
2. **Type safety**: Use TypeScript interfaces for all data structures
3. **Unique IDs**: Every element must have a unique ID for export
4. **Immutable updates**: Use spread operators for state updates
5. **Progressive enhancement**: Start with basic features, add complexity gradually

## 🐛 Debugging

### Common Issues

**Export produces blank image**:
- Check banner ID is correctly set
- Verify CORS settings for external images
- Ensure `allowTaint: true` in html2canvas options

**Master propagation not working**:
- Verify `formatId` matches column master ID
- Check `updateBannerContent` logic in hook
- Ensure Map is being cloned properly

**Performance issues**:
- Reduce number of simultaneous exports
- Increase delay between exports (currently 100ms)
- Check for memory leaks in useEffect cleanup

## 🎓 Learning Resources

- **html2canvas docs**: https://html2canvas.hertzen.com/
- **JSZip docs**: https://stuk.github.io/jszip/
- **React Hooks patterns**: https://react.dev/reference/react

---

**Last Updated**: February 13, 2026
**Version**: 2.0.0 (Refactored Architecture)
