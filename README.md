# BannerCanva

Professional banner generator: design one master banner and produce a complete, consistent ad set across every format — Google Ads, Instagram, Facebook, Pinterest and custom sizes — with one-click bulk export.

## Features

- **Master → child propagation** — edit the Super Master (first 1:1 banner) and every banner in the set updates; edit a column master and only its column updates; edit a child and only that banner changes.
- **Multi-format canvas** — square, horizontal and vertical columns with predefined ad formats plus user-defined custom sizes.
- **Full visual editor** — background images, extra images, shapes, multi-text with rich formatting, CTA buttons (gradients, shadows, variants), free positioning, element groups, layer reordering (drag & drop), zoom.
- **Export pipeline** — PNG/JPG at 2x scale, single banner, per-column ZIP or full-set ZIP, with live thumbnails and progress. Heavy libraries (html2canvas, JSZip) load on demand.

## Tech stack

| Layer     | Choice                                          |
| --------- | ----------------------------------------------- |
| UI        | React 18 + TypeScript (strict)                  |
| Build     | Vite 6                                          |
| Styling   | Tailwind CSS 4                                  |
| Component | shadcn/ui (Radix primitives) — only the 13 used |
| Export    | html2canvas + JSZip (lazy-loaded)               |
| DnD       | react-dnd                                       |
| Quality   | ESLint 9 (flat config) + Prettier + strict tsc  |

## Getting started

```bash
npm install
npm run dev        # development server
```

## Scripts

| Script                 | What it does                              |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start the Vite dev server                 |
| `npm run build`        | Typecheck (strict) + production build     |
| `npm run preview`      | Preview the production build              |
| `npm run typecheck`    | `tsc --noEmit`                            |
| `npm run lint`         | ESLint over `src/`                        |
| `npm run format`       | Prettier write over `src/`                |
| `npm run format:check` | Prettier check (CI)                       |

## Project structure

```
src/
├── app/
│   ├── App.tsx                 # Application orchestrator
│   ├── components/             # Canvas, editors, sidebar, export UI
│   │   ├── ui/                 # shadcn/ui primitives (trimmed to what's used)
│   │   ├── editors/            # Background / Image / Logo editors
│   │   └── left-sidebar/       # Insert, Sizes, Templates panels
│   ├── hooks/                  # useBannerManager, useBannerExport, thumbnails…
│   ├── utils/                  # positioning, grouping, export helpers
│   ├── data/                   # button presets
│   └── types/banner.ts         # Domain types & format catalog
├── styles/                     # Tailwind entry, theme, fonts
└── main.tsx                    # Entry (StrictMode + ErrorBoundary)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data-flow and propagation rules, and [USER_GUIDE.md](USER_GUIDE.md) for end-user documentation.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, master/child propagation, export pipeline
- [USER_GUIDE.md](USER_GUIDE.md) — end-user guide
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md) — third-party licenses
