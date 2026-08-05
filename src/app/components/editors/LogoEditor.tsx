import { BannerContent } from '../../types/banner';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface LogoEditorProps {
  content: BannerContent;
  onContentChange: (content: BannerContent) => void;
}

export function LogoEditor({ content, onContentChange }: LogoEditorProps) {
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onContentChange({ ...content, logo: base64String });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-8">
        <TabsTrigger value="content" className="text-xs">
          Content
        </TabsTrigger>
        <TabsTrigger value="style" className="text-xs">
          Style
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-xs">
          Layout
        </TabsTrigger>
      </TabsList>

      {/* CONTENT TAB */}
      <TabsContent value="content" className="mt-3">
        <div className="pr-1">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Logo Image</h3>

              {/* Current Logo Preview */}
              {content.logo && (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-3 flex items-center justify-center">
                  <img
                    src={content.logo}
                    alt="Logo"
                    className="max-w-full max-h-20 object-contain"
                  />
                </div>
              )}

              {/* Upload Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  };
                  input.click();
                }}
              >
                <Upload className="h-3 w-3 mr-2" />
                {content.logo ? 'Change Logo' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* STYLE TAB */}
      <TabsContent value="style" className="mt-3">
        <div className="pr-1">
          <div className="space-y-3">
            {/* Logo Background */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Background</Label>
                <Switch
                  checked={content.logoBackgroundEnabled}
                  onCheckedChange={(checked) =>
                    onContentChange({ ...content, logoBackgroundEnabled: checked })
                  }
                />
              </div>

              {content.logoBackgroundEnabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={content.logoBackgroundColor}
                        onChange={(e) =>
                          onContentChange({ ...content, logoBackgroundColor: e.target.value })
                        }
                        className="h-8 w-14 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={content.logoBackgroundColor}
                        onChange={(e) =>
                          onContentChange({ ...content, logoBackgroundColor: e.target.value })
                        }
                        className="h-8 flex-1 text-xs font-mono"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-600">Opacity</Label>
                      <span className="text-xs font-mono text-gray-500">
                        {content.logoBackgroundOpacity}%
                      </span>
                    </div>
                    <Slider
                      value={[content.logoBackgroundOpacity]}
                      onValueChange={([value]) =>
                        onContentChange({ ...content, logoBackgroundOpacity: value })
                      }
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* LAYOUT TAB */}
      <TabsContent value="layout" className="mt-3">
        <div className="pr-1">
          <div className="space-y-4">
            {/* Quick Position Preset */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Quick Position</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                  <Button
                    key={pos}
                    size="sm"
                    variant={
                      content.logoPosition === pos && content.logoX === undefined
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() =>
                      onContentChange({
                        ...content,
                        logoPosition: pos,
                        logoX: undefined,
                        logoY: undefined,
                      })
                    }
                    className="text-xs capitalize h-7"
                  >
                    {pos.replace('-', ' ')}
                  </Button>
                ))}
              </div>
              {content.logoX !== undefined && content.logoY !== undefined && (
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
                    value={content.logoX ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      onContentChange({
                        ...content,
                        logoX: v === '' ? undefined : parseInt(v) || 0,
                      });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Y</Label>
                  <Input
                    type="number"
                    value={content.logoY ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      onContentChange({
                        ...content,
                        logoY: v === '' ? undefined : parseInt(v) || 0,
                      });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Width / Height (px) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Size (px)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Width</Label>
                  <Input
                    type="number"
                    value={content.logoWidth ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      onContentChange({
                        ...content,
                        logoWidth: v === '' ? undefined : Math.max(10, parseInt(v) || 0),
                      });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Height</Label>
                  <Input
                    type="number"
                    value={content.logoHeight ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value;
                      onContentChange({
                        ...content,
                        logoHeight: v === '' ? undefined : Math.max(10, parseInt(v) || 0),
                      });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Logo Scale (%) — legacy + quick sizing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Scale</Label>
                <span className="text-xs font-mono text-gray-500">{content.logoSize}%</span>
              </div>
              <Slider
                value={[content.logoSize]}
                onValueChange={([value]) => onContentChange({ ...content, logoSize: value })}
                min={30}
                max={200}
                step={5}
              />
              <p className="text-xs text-gray-400 italic">Used when Width/Height are empty</p>
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Rotation</Label>
                <span className="text-xs font-mono text-gray-400">
                  {content.logoRotation || 0}deg
                </span>
              </div>
              <Slider
                value={[content.logoRotation || 0]}
                onValueChange={([value]) => onContentChange({ ...content, logoRotation: value })}
                min={-180}
                max={180}
                step={5}
              />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
