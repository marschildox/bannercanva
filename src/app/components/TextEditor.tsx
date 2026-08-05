import { TextElement, SelectedElement } from '../types/banner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

interface TextEditorProps {
  text: TextElement;
  index: number;
  onTextChange: (index: number, text: TextElement) => void;
  onDeleteText: (index: number) => void;
  onElementSelect?: (element: SelectedElement | null) => void;
}

export function TextEditor({
  text,
  index,
  onTextChange,
  onDeleteText,
  onElementSelect,
}: TextEditorProps) {
  const fontFamily = text.fontFamily || 'Poppins';
  const fontWeight = text.fontWeight || 'normal';
  const fontStyle = text.fontStyle || 'normal';
  const textTransform = text.textTransform || 'none';
  const textAlign = text.textAlign || 'center';
  const paddingX = text.paddingX || 16;
  const paddingY = text.paddingY || 8;

  const updateField = (field: keyof TextElement, value: any) => {
    onTextChange(index, { ...text, [field]: value });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-700">Text {index + 1}</h4>
            <span className="text-xs text-gray-400 truncate">"{text.text || 'Empty'}"</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-red-100 shrink-0"
          onClick={() => onDeleteText(index)}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-600" />
        </Button>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="style" className="text-xs">
            Style
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            Layout
          </TabsTrigger>
        </TabsList>

        {/* ============ STYLE TAB ============ */}
        <TabsContent value="style" className="mt-3">
          <div className="pr-1 space-y-4">
            {/* Text Content */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Text Content</Label>
              <Input
                value={text.text}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Enter text"
                className="text-sm"
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
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
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Size</Label>
                <span className="text-xs font-mono text-gray-500">{text.fontSize}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateField('fontSize', Math.max(50, text.fontSize - 5))}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Slider
                  value={[text.fontSize]}
                  onValueChange={([value]) => updateField('fontSize', value)}
                  min={50}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateField('fontSize', Math.min(200, text.fontSize + 5))}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Bold / Italic / Underline + Transform */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Format</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={fontWeight === 'bold' ? 'default' : 'outline'}
                  onClick={() =>
                    updateField('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')
                  }
                  className="h-8 w-8 p-0"
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={fontStyle === 'italic' ? 'default' : 'outline'}
                  onClick={() =>
                    updateField('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')
                  }
                  className="h-8 w-8 p-0"
                  title="Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={text.textDecoration === 'underline' ? 'default' : 'outline'}
                  onClick={() =>
                    updateField(
                      'textDecoration',
                      text.textDecoration === 'underline' ? 'none' : 'underline',
                    )
                  }
                  className="h-8 w-8 p-0"
                  title="Underline"
                >
                  <Underline className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px bg-gray-200 mx-1" />
                <Button
                  size="sm"
                  variant={textTransform === 'uppercase' ? 'default' : 'outline'}
                  onClick={() =>
                    updateField(
                      'textTransform',
                      textTransform === 'uppercase' ? 'none' : 'uppercase',
                    )
                  }
                  className="h-8 px-2 text-xs"
                  title="Uppercase"
                >
                  AA
                </Button>
                <Button
                  size="sm"
                  variant={textTransform === 'capitalize' ? 'default' : 'outline'}
                  onClick={() =>
                    updateField(
                      'textTransform',
                      textTransform === 'capitalize' ? 'none' : 'capitalize',
                    )
                  }
                  className="h-8 px-2 text-xs"
                  title="Capitalize"
                >
                  Aa
                </Button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Alignment</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={textAlign === 'left' ? 'default' : 'outline'}
                  onClick={() => updateField('textAlign', 'left')}
                  className="h-8 w-8 p-0"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={textAlign === 'center' ? 'default' : 'outline'}
                  onClick={() => updateField('textAlign', 'center')}
                  className="h-8 w-8 p-0"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={textAlign === 'right' ? 'default' : 'outline'}
                  onClick={() => updateField('textAlign', 'right')}
                  className="h-8 w-8 p-0"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={textAlign === 'justify' ? 'default' : 'outline'}
                  onClick={() => updateField('textAlign', 'justify')}
                  className="h-8 w-8 p-0"
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Text Color — only color, no background */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Text Color</Label>
                <label
                  className="flex items-center gap-1.5 cursor-pointer"
                  title="Automatically adapt color, weight and size for contrast against the background"
                >
                  <span className="text-[10px] font-semibold uppercase text-gray-500">
                    Auto contrast
                  </span>
                  <Switch
                    checked={text.autoContrast !== false}
                    onCheckedChange={(checked) => updateField('autoContrast', checked)}
                    className="scale-75"
                  />
                </label>
              </div>
              <div className="flex gap-1.5">
                <Input
                  type="color"
                  value={text.color}
                  onChange={(e) =>
                    onTextChange(index, { ...text, color: e.target.value, autoContrast: false })
                  }
                  className="h-8 w-10 p-0.5 cursor-pointer"
                />
                <Input
                  type="text"
                  value={text.color}
                  onChange={(e) =>
                    onTextChange(index, { ...text, color: e.target.value, autoContrast: false })
                  }
                  className="h-8 flex-1 text-xs font-mono"
                />
              </div>
              <p className="text-xs text-gray-400 italic">
                {text.autoContrast !== false
                  ? 'Color adapts to the background automatically. Picking a color turns Auto off.'
                  : 'Tip: use a Shape element behind text for colored backgrounds'}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ============ LAYOUT TAB ============ */}
        <TabsContent value="layout" className="mt-3">
          <div className="pr-1 space-y-4">
            {/* Position Preset (quick-access) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Quick Position</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <Button
                    key={pos}
                    size="sm"
                    variant={
                      text.position === pos && text.x === undefined && text.y === undefined
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => {
                      // Reset to preset — clear manual x/y
                      onTextChange(index, { ...text, position: pos, x: undefined, y: undefined });
                    }}
                    className="text-xs capitalize h-7"
                  >
                    {pos}
                  </Button>
                ))}
              </div>
              {text.x !== undefined && text.y !== undefined && (
                <p className="text-xs text-amber-600">
                  Using manual position. Click a preset to reset.
                </p>
              )}
            </div>

            {/* Manual X / Y */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Position (px)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">X</Label>
                  <Input
                    type="number"
                    value={text.x ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField('x', v === '' ? undefined : parseInt(v) || 0);
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Y</Label>
                  <Input
                    type="number"
                    value={text.y ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField('y', v === '' ? undefined : parseInt(v) || 0);
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Width / Height */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Size (px)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Width</Label>
                  <Input
                    type="number"
                    value={text.width ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField('width', v === '' ? undefined : Math.max(20, parseInt(v) || 0));
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Height</Label>
                  <Input
                    type="number"
                    value={text.height ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      updateField('height', v === '' ? undefined : Math.max(20, parseInt(v) || 0));
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Width Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Width Mode</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  variant={text.bgStyle === 'full-width' ? 'default' : 'outline'}
                  onClick={() => updateField('bgStyle', 'full-width')}
                  className="text-xs h-7"
                >
                  Full Width
                </Button>
                <Button
                  size="sm"
                  variant={text.bgStyle === 'inline' ? 'default' : 'outline'}
                  onClick={() => updateField('bgStyle', 'inline')}
                  className="text-xs h-7"
                >
                  Inline
                </Button>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Rotation</Label>
                <span className="text-xs font-mono text-gray-400">{text.rotation || 0}deg</span>
              </div>
              <Slider
                value={[text.rotation || 0]}
                onValueChange={([v]) => updateField('rotation', v)}
                min={-180}
                max={180}
                step={5}
              />
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Padding</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Horizontal</Label>
                    <span className="text-xs font-mono text-gray-400">{paddingX}px</span>
                  </div>
                  <Slider
                    value={[paddingX]}
                    onValueChange={([v]) => updateField('paddingX', v)}
                    min={0}
                    max={100}
                    step={4}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Vertical</Label>
                    <span className="text-xs font-mono text-gray-400">{paddingY}px</span>
                  </div>
                  <Slider
                    value={[paddingY]}
                    onValueChange={([v]) => updateField('paddingY', v)}
                    min={0}
                    max={100}
                    step={4}
                  />
                </div>
              </div>
            </div>

            {/* Line Height & Letter Spacing */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Spacing</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Line H.</Label>
                    <span className="text-xs font-mono text-gray-400">
                      {text.lineHeight || 120}%
                    </span>
                  </div>
                  <Slider
                    value={[text.lineHeight || 120]}
                    onValueChange={([v]) => updateField('lineHeight', v)}
                    min={80}
                    max={200}
                    step={10}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Letter</Label>
                    <span className="text-xs font-mono text-gray-400">
                      {text.letterSpacing || 0}px
                    </span>
                  </div>
                  <Slider
                    value={[text.letterSpacing || 0]}
                    onValueChange={([v]) => updateField('letterSpacing', v)}
                    min={-2}
                    max={10}
                    step={0.5}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
