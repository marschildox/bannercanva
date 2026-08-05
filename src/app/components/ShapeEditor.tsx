import { ShapeElement, SelectedElement } from '../types/banner';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Trash2, Square, Circle, Triangle, Layers } from 'lucide-react';

interface ShapeEditorProps {
  shape: ShapeElement;
  index: number;
  onChange: (index: number, shape: ShapeElement) => void;
  onDelete: (index: number) => void;
  onElementSelect?: (element: SelectedElement | null) => void;
}

export function ShapeEditor({ shape, index, onChange, onDelete }: ShapeEditorProps) {
  const handleChange = (field: keyof ShapeElement, value: any) => {
    onChange(index, { ...shape, [field]: value });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-700">Shape {index + 1}</h4>
            <span className="text-xs text-gray-400 capitalize">{shape.type}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-red-100 shrink-0"
          onClick={() => onDelete(index)}
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
            {/* Shape Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Shape</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { type: 'rectangle', icon: Square, label: 'Rect' },
                    { type: 'circle', icon: Circle, label: 'Circle' },
                    { type: 'triangle', icon: Triangle, label: 'Triangle' },
                  ] as const
                ).map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={shape.type === type ? 'default' : 'outline'}
                    onClick={() => handleChange('type', type)}
                    className="h-9 flex flex-col gap-0.5 text-xs p-1"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px]">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={shape.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="h-8 w-12 p-0.5 cursor-pointer"
                />
                <Input
                  type="text"
                  value={shape.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="h-8 flex-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Opacity</Label>
                <span className="text-xs font-mono text-gray-400">{shape.opacity}%</span>
              </div>
              <Slider
                value={[shape.opacity]}
                onValueChange={([v]) => handleChange('opacity', v)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Background toggle */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                Background Layer
              </Label>
              <button
                onClick={() => handleChange('isBackground', !shape.isBackground)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors
                  ${
                    shape.isBackground
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <span>{shape.isBackground ? 'Background element' : 'Normal element'}</span>
                <div
                  className={`
                  w-8 h-4.5 rounded-full transition-colors relative
                  ${shape.isBackground ? 'bg-indigo-500' : 'bg-gray-300'}
                `}
                >
                  <div
                    className={`
                    absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform
                    ${shape.isBackground ? 'translate-x-4' : 'translate-x-0.5'}
                  `}
                  />
                </div>
              </button>
              <p className="text-[10px] text-gray-400">
                Background elements stretch to fill the entire banner in SmartLayout
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ============ LAYOUT TAB ============ */}
        <TabsContent value="layout" className="mt-3">
          <div className="pr-1 space-y-4">
            {/* Position */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">X</Label>
                  <Input
                    type="number"
                    value={shape.x || 0}
                    onChange={(e) => handleChange('x', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Y</Label>
                  <Input
                    type="number"
                    value={shape.y || 0}
                    onChange={(e) => handleChange('y', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Size</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Width</Label>
                  <Input
                    type="number"
                    value={shape.width || 100}
                    onChange={(e) => handleChange('width', parseInt(e.target.value) || 100)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Height</Label>
                  <Input
                    type="number"
                    value={shape.height || 100}
                    onChange={(e) => handleChange('height', parseInt(e.target.value) || 100)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Rotation</Label>
                <span className="text-xs font-mono text-gray-400">{shape.rotation || 0}deg</span>
              </div>
              <Slider
                value={[shape.rotation || 0]}
                onValueChange={([v]) => handleChange('rotation', v)}
                min={-180}
                max={180}
                step={5}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
