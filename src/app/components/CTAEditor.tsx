import React from 'react';
import { BannerContent, CTA, SelectedElement } from '../types/banner';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Trash2, Sparkles } from 'lucide-react';
import { BUTTON_PRESETS, ButtonPreset } from '../data/button-presets';

interface CTAEditorProps {
  cta: CTA;
  index: number;
  onChange: (index: number, cta: CTA) => void;
  onDelete: (index: number) => void;
  canDelete: boolean;
  onElementSelect?: (element: SelectedElement | null) => void;
  content?: BannerContent;
  onContentChange?: (content: BannerContent) => void;
}

export function CTAEditor({
  cta,
  index,
  onChange,
  onDelete,
  canDelete,
  onElementSelect,
  content,
  onContentChange,
}: CTAEditorProps) {
  const fontFamily = cta.fontFamily || 'Poppins';
  const fontWeight = cta.fontWeight || 700;
  const fontSize = cta.fontSize || 100;
  const letterSpacing = cta.letterSpacing || 0;
  const borderRadius = cta.borderRadius || 8;
  const variant = cta.variant || content?.ctaButtonType || 'solid';

  // Colors: individual CTA overrides or fall back to global
  const bgColor = cta.bgColor || content?.ctaBgColor || '#FF6B35';
  const textColor = cta.textColor || content?.ctaTextColor || '#FFFFFF';
  const borderColor = cta.borderColor || bgColor;
  const borderWidth =
    cta.borderWidth !== undefined ? cta.borderWidth : content?.ctaBorderWidth || 0;

  const updateField = (field: keyof CTA, value: any) => {
    onChange(index, { ...cta, [field]: value });
  };

  const applyPreset = (preset: ButtonPreset) => {
    if (!content || !onContentChange) return;

    const updatedCTA: CTA = {
      ...cta,
      fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight,
      fontSize: preset.fontSize,
      letterSpacing: preset.letterSpacing,
      textShadow: preset.textShadow,
      borderRadius: preset.borderRadius,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
      borderColor: preset.borderColor,
      borderWidth: preset.borderWidth,
      variant: preset.variant === 'outline' ? 'outline' : 'solid',
      gradient: {
        enabled: preset.variant === 'gradient',
        from: preset.gradientFrom || preset.bgColor,
        to: preset.gradientTo || preset.bgColor,
        direction: preset.gradientDirection || 'to-r',
      },
      shadow: {
        enabled: preset.shadowEnabled,
        color: preset.shadowColor || '#000000',
        blur: preset.shadowBlur || 0,
        offsetX: preset.shadowOffsetX || 0,
        offsetY: preset.shadowOffsetY || 0,
      },
    };

    const updatedContent: BannerContent = {
      ...content,
      ctas: content.ctas.map((c, i) => (i === index ? updatedCTA : c)),
    };

    onContentChange(updatedContent);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-700">CTA {index + 1}</h4>
            <span className="text-xs text-gray-400 truncate">"{cta.text || 'Empty'}"</span>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-red-100 shrink-0"
            onClick={() => onDelete(index)}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="style" className="text-xs">
            Style
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">
            Presets
          </TabsTrigger>
        </TabsList>

        {/* ============ STYLE TAB ============ */}
        <TabsContent value="style" className="mt-3">
          <div className="pr-1 space-y-4">
            {/* Button Text */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Button Text</Label>
              <Input
                value={cta.text}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Click here"
                className="text-sm"
              />
            </div>

            {/* Variant */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Variant</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['solid', 'outline', 'ghost'] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={variant === v ? 'default' : 'outline'}
                    onClick={() => updateField('variant', v)}
                    className="text-xs capitalize h-7"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-gray-700">Colors</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* BG Color */}
                {variant !== 'ghost' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      {variant === 'outline' ? 'Border' : 'Background'}
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        type="color"
                        value={variant === 'outline' ? borderColor : bgColor}
                        onChange={(e) =>
                          updateField(
                            variant === 'outline' ? 'borderColor' : 'bgColor',
                            e.target.value,
                          )
                        }
                        className="h-8 w-10 p-0.5 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={variant === 'outline' ? borderColor : bgColor}
                        onChange={(e) =>
                          updateField(
                            variant === 'outline' ? 'borderColor' : 'bgColor',
                            e.target.value,
                          )
                        }
                        className="h-8 flex-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
                {/* Text Color */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Text</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="h-8 w-10 p-0.5 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={textColor}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="h-8 flex-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Font */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Font</Label>
                <Select
                  value={fontFamily}
                  onValueChange={(value) => updateField('fontFamily', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Raleway">Raleway</SelectItem>
                    <SelectItem value="Oswald">Oswald</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Weight</Label>
                <Select
                  value={String(fontWeight)}
                  onValueChange={(value) => updateField('fontWeight', Number(value))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="400">Regular</SelectItem>
                    <SelectItem value="500">Medium</SelectItem>
                    <SelectItem value="600">Semibold</SelectItem>
                    <SelectItem value="700">Bold</SelectItem>
                    <SelectItem value="800">Extrabold</SelectItem>
                    <SelectItem value="900">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Size & Radius */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Size</Label>
                  <span className="text-xs font-mono text-gray-400">{fontSize}%</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => updateField('fontSize', v)}
                  min={50}
                  max={150}
                  step={5}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Radius</Label>
                  <span className="text-xs font-mono text-gray-400">{borderRadius}px</span>
                </div>
                <Slider
                  value={[borderRadius]}
                  onValueChange={([v]) => updateField('borderRadius', v)}
                  min={0}
                  max={50}
                  step={2}
                />
              </div>
            </div>

            {/* Border Width (for outline) */}
            {variant === 'outline' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Border Width</Label>
                  <span className="text-xs font-mono text-gray-400">{borderWidth}px</span>
                </div>
                <Slider
                  value={[borderWidth]}
                  onValueChange={([v]) => updateField('borderWidth', v)}
                  min={1}
                  max={6}
                  step={1}
                />
              </div>
            )}

            {/* Letter Spacing */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Letter Spacing</Label>
                <span className="text-xs font-mono text-gray-400">{letterSpacing}px</span>
              </div>
              <Slider
                value={[letterSpacing]}
                onValueChange={([v]) => updateField('letterSpacing', v)}
                min={-2}
                max={10}
                step={0.5}
              />
            </div>
          </div>
        </TabsContent>

        {/* ============ PRESETS TAB ============ */}
        <TabsContent value="presets" className="mt-3">
          <div className="pr-1 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <Label className="text-xs font-semibold text-gray-700">Button Presets</Label>
            </div>
            <p className="text-xs text-gray-500">Click to apply a style instantly</p>

            <div className="space-y-2">
              {(() => {
                const groupedPresets: ButtonPreset[][] = [];
                for (let i = 0; i < BUTTON_PRESETS.length; i += 3) {
                  groupedPresets.push(BUTTON_PRESETS.slice(i, i + 3));
                }

                return groupedPresets.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-3 gap-1.5">
                    {row.map((preset) => {
                      const buttonStyle: React.CSSProperties = {
                        padding: '5px 10px',
                        fontSize: '9px',
                        fontFamily: preset.fontFamily || 'inherit',
                        fontWeight: preset.fontWeight || 400,
                        letterSpacing: preset.letterSpacing ? `${preset.letterSpacing}px` : '0px',
                        borderRadius: `${preset.borderRadius}px`,
                        borderWidth: `${preset.borderWidth}px`,
                        borderStyle: 'solid',
                        cursor: 'pointer',
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
                        const directionMap: Record<string, string> = {
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
                        buttonStyle.borderColor =
                          preset.borderColor || preset.gradientFrom || '#000';
                      } else if (preset.variant === 'outline') {
                        buttonStyle.backgroundColor = 'transparent';
                        buttonStyle.borderColor = preset.borderColor || preset.textColor;
                      }

                      if (preset.shadowEnabled) {
                        buttonStyle.boxShadow = `${preset.shadowOffsetX || 0}px ${preset.shadowOffsetY || 0}px ${preset.shadowBlur || 0}px ${preset.shadowColor || 'rgba(0,0,0,0.2)'}`;
                      }

                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          style={buttonStyle}
                          className="hover:scale-105 active:scale-95 transition-transform"
                          title={preset.name}
                        >
                          BTN
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>

            <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-xs text-orange-700 flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                <span>Each row: Solid / Gradient / Outline</span>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
