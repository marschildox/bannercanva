import { Crown, LayoutTemplate } from 'lucide-react';
import { BANNER_TEMPLATES, BannerTemplate } from '../../data/templates';
import { BannerFormat } from '../../types/banner';

interface TemplatesPanelProps {
  onApplyTemplate?: (template: BannerTemplate) => void;
  selectedFormat?: BannerFormat | null;
  isMasterSelected?: boolean;
}

/** Pure-CSS miniature of a template design (no image capture needed) */
function TemplatePreview({ template }: { template: BannerTemplate }) {
  const { preview } = template;
  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-t-[7px] bg-gray-100">
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0" style={{ background: preview.background }} />
      {/* Headline */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
        <span
          className="text-[11px] font-bold text-center leading-tight"
          style={{ color: preview.headlineColor }}
        >
          {preview.headline}
        </span>
        <span
          className="text-[8px] font-semibold px-2 py-0.5 rounded"
          style={{
            background: preview.ctaBackground,
            color: preview.ctaColor,
            border: preview.ctaBackground === 'transparent' ? '1px solid currentColor' : 'none',
          }}
        >
          {preview.ctaLabel}
        </span>
      </div>
    </div>
  );
}

export function TemplatesPanel({
  onApplyTemplate,
  selectedFormat,
  isMasterSelected,
}: TemplatesPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedFormat
            ? isMasterSelected
              ? 'Applies to the whole set via the Master'
              : `Applies to ${selectedFormat.name}`
            : 'Applies to the Master → whole set'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto overflow-x-hidden">
        {!selectedFormat && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <Crown className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              No banner selected — the template will restyle the Super Master and propagate to every
              banner.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {BANNER_TEMPLATES.map((template) => (
            <button
              key={template.id}
              className="group text-left rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden bg-white"
              onClick={() => onApplyTemplate?.(template)}
              title={template.description}
            >
              <TemplatePreview template={template} />
              <div className="px-2 py-1.5">
                <div className="text-xs font-semibold text-gray-900">{template.name}</div>
                <div className="text-[10px] text-gray-500 leading-tight line-clamp-2">
                  {template.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center text-gray-400">
          <LayoutTemplate className="h-10 w-10 mx-auto mb-1 opacity-20" />
          <p className="text-xs">Your logo is kept when applying a template</p>
        </div>
      </div>
    </div>
  );
}
