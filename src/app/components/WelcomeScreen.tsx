import {
  Wand2,
  MousePointerClick,
  Layers,
  Download,
  Sparkles,
  Contrast,
  LayoutTemplate,
  Save,
  ArrowRight,
  X,
  Keyboard,
} from 'lucide-react';
import { Button } from './ui/button';

interface WelcomeScreenProps {
  open: boolean;
  /** True when a previously autosaved board was restored */
  hasExistingProject: boolean;
  onStartCampaign: () => void;
  onOpenEditor: () => void;
  onClose: () => void;
}

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Pick your sizes',
    body: 'Click any of the 34 preset ad formats — or your own custom size — and it lands on the board in the right column. Square, horizontal and vertical each get their own column.',
  },
  {
    icon: Layers,
    title: 'Design the master once',
    body: 'Edit the first square banner: background, logo, headline, button. Every other banner inherits the design and is re-composed for its own dimensions, so nothing is a stretched copy.',
  },
  {
    icon: Download,
    title: 'Export the whole set',
    body: 'Preview every banner, then download one PNG or a ZIP of the set. Exports are rendered by the browser itself, so what you see on the canvas is exactly what ships.',
  },
];

const FEATURES = [
  {
    icon: Contrast,
    title: 'Text that stays readable',
    body: 'Each banner samples the background under its own text and adapts colour, weight and size to hit WCAG contrast.',
  },
  {
    icon: LayoutTemplate,
    title: '8 starting templates',
    body: 'Apply a curated design to one banner or the whole set. Your logo is always preserved.',
  },
  {
    icon: Sparkles,
    title: 'Optional AI',
    body: 'Bring your own API keys and let Claude write the copy and Gemini generate backgrounds. Everything works without them too.',
  },
  {
    icon: Save,
    title: 'Nothing gets lost',
    body: 'Your board autosaves in this browser, and you can export the project as a file to move it or keep versions.',
  },
];

/** Miniature of the master → variants idea, in plain CSS. */
function PropagationDiagram() {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {/* Master */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative w-20 h-20 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shadow-md flex flex-col items-center justify-center gap-1 p-2">
          <div className="w-10 h-1.5 rounded-full bg-white/90" />
          <div className="w-12 h-1.5 rounded-full bg-white/60" />
          <div className="mt-1 w-9 h-3 rounded bg-orange-400" />
        </div>
        <span className="text-[10px] font-semibold text-blue-600">Master</span>
      </div>

      <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />

      {/* Derived formats */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-24 h-7 rounded-md bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center gap-1 px-1.5">
            <div className="flex-1 h-1 rounded-full bg-blue-400/70" />
            <div className="w-5 h-2.5 rounded bg-orange-400" />
          </div>
          <span className="text-[10px] text-gray-400">970×90</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-20 rounded-md bg-gradient-to-b from-blue-100 to-blue-200 border border-blue-300 flex flex-col items-center justify-center gap-1 p-1">
            <div className="w-6 h-1 rounded-full bg-blue-400/70" />
            <div className="w-7 h-1 rounded-full bg-blue-400/50" />
            <div className="mt-0.5 w-6 h-2.5 rounded bg-orange-400" />
          </div>
          <span className="text-[10px] text-gray-400">Story</span>
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreen({
  open,
  hasExistingProject,
  onStartCampaign,
  onOpenEditor,
  onClose,
}: WelcomeScreenProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 overflow-y-auto">
      {/* Dismiss */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm border border-gray-200 hover:text-gray-900 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        Close
      </button>

      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* ── Hero ── */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            BannerCanva
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Design one banner.
            <br className="hidden sm:block" /> Get the whole campaign.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 leading-relaxed">
            Build a master design once, and BannerCanva produces every ad format around it — each
            one re-composed for its own dimensions instead of squashed to fit. Then export the set
            in one go.
          </p>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <PropagationDiagram />
            <p className="mt-4 text-xs text-gray-500">
              Edit the master and every banner follows. Edit one banner and only that one changes.
            </p>
          </div>
        </header>

        {/* ── How it works ── */}
        <section className="mt-14">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── What you also get ── */}
        <section className="mt-12">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            What else it does for you
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{feature.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Start ── */}
        <section className="mt-12 rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {hasExistingProject ? 'Pick up where you left off' : 'Ready when you are'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-gray-600">
            {hasExistingProject
              ? 'Your last board was restored automatically. Continue with it, or start a guided campaign from scratch.'
              : 'Start with a few guided questions, or jump straight into the editor and pick your sizes.'}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="sm" onClick={onStartCampaign} className="gap-2 w-full sm:w-auto">
              <Wand2 className="h-4 w-4" />
              Start a guided campaign
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenEditor}
              className="gap-2 w-full sm:w-auto"
            >
              {hasExistingProject ? 'Continue on my board' : 'Open the editor'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* ── Canvas tips ── */}
        <section className="mt-8 rounded-xl border border-gray-200 bg-white/60 p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-gray-500" />
            <h2 className="text-xs font-semibold text-gray-700">Moving around the board</h2>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            {[
              ['Pan', 'Two-finger scroll, space + drag, or drag empty canvas'],
              ['Zoom', 'Pinch, or Ctrl/Cmd + scroll — zooms towards your cursor'],
              ['Frame everything', 'The fit button, bottom right'],
              ['Group elements', 'Select several, then Ctrl/Cmd + G'],
            ].map(([term, definition]) => (
              <div key={term} className="flex gap-2">
                <dt className="font-medium text-gray-700 shrink-0">{term}</dt>
                <dd className="text-gray-500">{definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-8 text-center text-[11px] text-gray-400">
          You can reopen this page any time from the help button in the top bar.
        </p>
      </div>
    </div>
  );
}
