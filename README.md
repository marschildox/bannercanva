# BannerCanva

Professional banner generator: design one master banner and produce a complete, consistent ad set across every format — Google Ads, Instagram, Facebook, Pinterest and custom sizes — with pixel-faithful one-click bulk export.

## Features

### Design once, generate everywhere

- **Master → child propagation** — edit the Super Master (first 1:1 banner) and every banner in the set updates; edit a column master and only its column updates; edit a child and only that banner changes.
- **Format-aware layout adaptation** — propagated content is re-laid-out for each target format (proportional scaling for similar aspect ratios, zone-based re-layout for very different ones), so a square design lands correctly on a leaderboard or a story instead of being a raw copy.
- **Templates** — 8 curated, format-agnostic starting designs (product launch, sale, minimal, elegant dark, tech, eco, food, fashion). One click applies a template to the selected banner — or to the Super Master to restyle the whole set. Your logo is preserved.

### Editor

- **One-click size catalog** — 34 preset ad formats plus user-defined custom sizes; click any size to add it to the board (its column is created automatically), with aspect-ratio thumbnails and on-board indicators.
- **Full visual editing** — background images, extra images, shapes, multi-text with rich formatting, CTA buttons (gradients, shadows, solid/outline/ghost), free positioning, element groups (Ctrl+G), sortable layers.
- **Auto text contrast** — the engine samples the composited background under each text and adapts color (white/dark by WCAG contrast ratio), weight (semibold on busy backgrounds) and size (large-text fallback when no flat color reaches 4.5:1). Per-text toggle; picking a manual color opts that text out.
- **Miro-style infinite canvas** — pinch or Ctrl/Cmd+wheel zooms towards the cursor, two-finger scroll pans, Space+drag and middle-button pan, zoom-to-fit, 10%–400% range.

### Export

- **Pixel-faithful captures** — rendering is done by the browser itself via SVG foreignObject (`html-to-image`), so exports match the canvas exactly: same text metrics, same font weights, same layout. `html2canvas` remains as an automatic fallback.
- **Batch pipeline** — PNG/JPG at up to 3x scale, single banner, per-column ZIP or full-set ZIP, with live thumbnails and progress. Heavy libraries load on demand.

## Tech stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| UI        | React 19 + TypeScript (strict)                    |
| Build     | Vite 6                                            |
| Styling   | Tailwind CSS 4                                    |
| Component | shadcn/ui (Radix primitives) — only the ones used |
| DnD       | @dnd-kit (sortable layers)                        |
| Export    | html-to-image (primary) + html2canvas (fallback), JSZip |
| Tests     | Vitest + Testing Library (run under StrictMode)   |
| Quality   | ESLint 9 (flat config) + Prettier + strict tsc    |

## Getting started

```bash
npm install
npm run dev        # development server
```

## Scripts

| Script                 | What it does                          |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start the Vite dev server             |
| `npm run build`        | Typecheck (strict) + production build |
| `npm run preview`      | Preview the production build          |
| `npm run test`         | Run the Vitest suite                  |
| `npm run test:watch`   | Vitest in watch mode                  |
| `npm run typecheck`    | `tsc --noEmit`                        |
| `npm run lint`         | ESLint over `src/`                    |
| `npm run format`       | Prettier write over `src/`            |
| `npm run format:check` | Prettier check (CI)                   |

## Project structure

```
src/
├── app/
│   ├── App.tsx                 # Application orchestrator
│   ├── components/             # Canvas, editors, sidebar, export UI
│   │   ├── ui/                 # shadcn/ui primitives (trimmed to what's used)
│   │   ├── editors/            # Background / Image / Logo editors
│   │   └── left-sidebar/       # Insert, Templates, Sizes panels
│   ├── hooks/                  # Banner manager, export, thumbnails,
│   │                           # auto text contrast
│   ├── utils/                  # Smart positioning, text contrast engine,
│   │                           # export/capture helpers, grouping
│   ├── data/                   # Templates catalog, button presets
│   └── types/banner.ts         # Domain types & format catalog
├── styles/                     # Tailwind entry, theme, fonts
└── main.tsx                    # Entry (StrictMode + ErrorBoundary)
```

## How the propagation model works

```
Super Master (first 1:1 banner)
 └─ propagates to ALL banners, adapting layout per format
Column Master (first banner of each column)
 └─ propagates to its column's children only
Child banner
 └─ changes affect only itself
```

Per-banner adjustments made by the auto-contrast engine never propagate — each banner samples its own background crop.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, propagation rules, export pipeline
- [USER_GUIDE.md](USER_GUIDE.md) — end-user guide
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md) — third-party licenses
