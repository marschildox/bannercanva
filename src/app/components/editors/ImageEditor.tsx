import { useState } from 'react';
import { ImageElement } from '../../types/banner';
import { Trash2, Upload, RotateCw, Layers } from 'lucide-react';
import { Button } from '../ui/button';

interface ImageEditorProps {
  image: ImageElement;
  index: number;
  onChange: (index: number, updated: ImageElement) => void;
  onDelete: (index: number) => void;
  onElementSelect?: (element: any) => void;
}

export function ImageEditor({
  image,
  index,
  onChange,
  onDelete,
  onElementSelect,
}: ImageEditorProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'layout'>('style');

  const update = (patch: Partial<ImageElement>) => {
    onChange(index, { ...image, ...patch });
  };

  const handleReplace = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        update({ src: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${activeTab === 'style' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('style')}
        >
          Style
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${activeTab === 'layout' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('layout')}
        >
          Layout
        </button>
      </div>

      {activeTab === 'style' && (
        <div className="space-y-4">
          {/* Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Preview
            </h4>
            <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
              <img src={image.src} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-1.5"
              onClick={handleReplace}
            >
              <Upload className="h-3 w-3" />
              Replace Image
            </Button>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Opacity
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={image.opacity}
                onChange={(e) => update({ opacity: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs text-gray-600 w-8 text-right">{image.opacity}%</span>
            </div>
          </div>

          {/* Background toggle */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              Background Layer
            </h4>
            <button
              onClick={() => update({ isBackground: !image.isBackground })}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors
                ${
                  image.isBackground
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                }
              `}
            >
              <span>{image.isBackground ? 'Background element' : 'Normal element'}</span>
              <div
                className={`
                w-8 h-4.5 rounded-full transition-colors relative
                ${image.isBackground ? 'bg-indigo-500' : 'bg-gray-300'}
              `}
              >
                <div
                  className={`
                  absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform
                  ${image.isBackground ? 'translate-x-4' : 'translate-x-0.5'}
                `}
                />
              </div>
            </button>
            <p className="text-[10px] text-gray-400">
              Background elements stretch to fill the entire banner in SmartLayout
            </p>
          </div>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="space-y-4">
          {/* Position */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Position
            </h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">X</label>
                <input
                  type="number"
                  value={Math.round(image.x || 0)}
                  onChange={(e) => update({ x: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Y</label>
                <input
                  type="number"
                  value={Math.round(image.y || 0)}
                  onChange={(e) => update({ y: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Size</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">W</label>
                <input
                  type="number"
                  value={Math.round(image.width || 200)}
                  onChange={(e) => update({ width: parseInt(e.target.value) || 10 })}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">H</label>
                <input
                  type="number"
                  value={Math.round(image.height || 200)}
                  onChange={(e) => update({ height: parseInt(e.target.value) || 10 })}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1">
              <RotateCw className="h-3 w-3" />
              Rotation
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-180}
                max={180}
                value={image.rotation || 0}
                onChange={(e) => update({ rotation: parseInt(e.target.value) })}
                className="flex-1"
              />
              <input
                type="number"
                value={image.rotation || 0}
                onChange={(e) => update({ rotation: parseInt(e.target.value) || 0 })}
                className="w-16 border rounded px-2 py-1 text-xs text-right"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="pt-2 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => onDelete(index)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Image
        </Button>
      </div>
    </div>
  );
}
