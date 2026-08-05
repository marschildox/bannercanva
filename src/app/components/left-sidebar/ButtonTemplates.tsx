import { BUTTON_PRESETS, ButtonPreset } from '../../data/button-presets';
import { BannerContent } from '../../types/banner';
import { Sparkles } from 'lucide-react';

interface ButtonTemplatesProps {
  selectedFormat?: any;
  content?: BannerContent;
  onContentChange?: (content: BannerContent) => void;
}

export function ButtonTemplates({
  selectedFormat,
  content,
  onContentChange,
}: ButtonTemplatesProps) {
  const isDisabled = !selectedFormat || !content || !onContentChange;

  const applyPreset = (preset: ButtonPreset) => {
    if (!content || !onContentChange) return;

    // Apply preset to global CTA settings
    const updatedContent: BannerContent = {
      ...content,
      ctaBorderRadius: preset.borderRadius,
      ctaBorderWidth: preset.borderWidth,
      ctaBgColor: preset.bgColor,
      ctaTextColor: preset.textColor,
      ctaButtonType:
        preset.variant === 'outline'
          ? 'outline'
          : preset.variant === 'gradient'
            ? 'solid'
            : 'solid',
      ctaGradient: {
        enabled: preset.variant === 'gradient',
        from: preset.gradientFrom || preset.bgColor,
        to: preset.gradientTo || preset.bgColor,
        direction: preset.gradientDirection || 'to-r',
      },
      ctaShadow: {
        enabled: preset.shadowEnabled,
        color: preset.shadowColor || '#000000',
        blur: preset.shadowBlur || 0,
        offsetX: preset.shadowOffsetX || 0,
        offsetY: preset.shadowOffsetY || 0,
      },
      // Apply advanced typography to all CTAs
      ctas: content.ctas.map((cta) => ({
        ...cta,
        fontFamily: preset.fontFamily,
        fontWeight: preset.fontWeight,
        fontSize: preset.fontSize,
        letterSpacing: preset.letterSpacing,
        textShadow: preset.textShadow,
        borderRadius: preset.borderRadius,
      })),
    };

    onContentChange(updatedContent);
  };

  // Group presets by rows (3 per row: solid, gradient, outline)
  const groupedPresets: ButtonPreset[][] = [];
  for (let i = 0; i < BUTTON_PRESETS.length; i += 3) {
    groupedPresets.push(BUTTON_PRESETS.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Button Templates</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isDisabled
            ? 'Select a banner to apply button styles'
            : 'Click a button to apply its style'}
        </p>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isDisabled ? (
          <div className="text-center py-12 text-gray-400">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select a banner first</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedPresets.map((row, rowIndex) => (
              <div key={rowIndex} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {row.map((preset) => {
                    // Calculate button style based on preset
                    const buttonStyle: React.CSSProperties = {
                      padding: '10px 20px',
                      fontSize: '11px',
                      fontFamily: preset.fontFamily || 'inherit',
                      fontWeight: preset.fontWeight || 400,
                      letterSpacing: preset.letterSpacing ? `${preset.letterSpacing}px` : '0px',
                      borderRadius: `${preset.borderRadius}px`,
                      borderWidth: `${preset.borderWidth}px`,
                      borderStyle: 'solid',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: preset.textColor,
                      whiteSpace: 'nowrap',
                      display: 'block',
                      width: '100%',
                      textAlign: 'center',
                    };

                    if (preset.variant === 'solid') {
                      buttonStyle.backgroundColor = preset.bgColor;
                      buttonStyle.borderColor = preset.bgColor;
                    } else if (preset.variant === 'gradient') {
                      const directionMap = {
                        'to-r': 'to right',
                        'to-l': 'to left',
                        'to-t': 'to top',
                        'to-b': 'to bottom',
                        'to-br': 'to bottom right',
                        'to-bl': 'to bottom left',
                      };
                      const direction = preset.gradientDirection
                        ? directionMap[preset.gradientDirection]
                        : 'to right';
                      buttonStyle.backgroundImage = `linear-gradient(${direction}, ${preset.gradientFrom}, ${preset.gradientTo})`;
                      buttonStyle.borderColor = preset.borderColor || preset.gradientFrom || '#000';
                    } else if (preset.variant === 'outline') {
                      buttonStyle.backgroundColor = 'transparent';
                      buttonStyle.borderColor = preset.borderColor || preset.textColor;
                    }

                    if (preset.shadowEnabled) {
                      buttonStyle.boxShadow = `${preset.shadowOffsetX || 0}px ${preset.shadowOffsetY || 0}px ${preset.shadowBlur || 0}px ${preset.shadowColor || 'rgba(0,0,0,0.2)'}`;
                    }

                    if (preset.textShadow) {
                      buttonStyle.textShadow = preset.textShadow;
                    }

                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        style={buttonStyle}
                        className="hover:scale-105 active:scale-95"
                        title={preset.name}
                      >
                        Button
                      </button>
                    );
                  })}
                </div>
                {rowIndex < groupedPresets.length - 1 && (
                  <div className="border-b border-gray-100"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!isDisabled && (
        <div className="p-3 border-t border-gray-200 bg-blue-50">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>Each row shows: Solid, Gradient, Outline variations</span>
          </p>
        </div>
      )}
    </div>
  );
}
