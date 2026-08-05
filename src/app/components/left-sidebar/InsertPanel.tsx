import {
  Type,
  Image,
  Square,
  MousePointer2,
  Shapes,
  Circle,
  Triangle,
  Plus,
  Edit,
  ChevronDown,
  ChevronRight,
  ImagePlus,
} from 'lucide-react';
import { BannerFormat, BannerContent, SelectedElement } from '../../types/banner';
import { useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  getNextAvailablePosition,
  getNextCTAPosition,
  getNextShapePosition,
} from '../../utils/positioning';

interface InsertPanelProps {
  selectedFormat: BannerFormat | null;
  content: BannerContent;
  onContentChange: (content: BannerContent) => void;
  onElementSelect?: (element: SelectedElement) => void;
}

export function InsertPanel({
  selectedFormat,
  content,
  onContentChange,
  onElementSelect,
}: InsertPanelProps) {
  const [shapesExpanded, setShapesExpanded] = useState(false);

  const isDisabled = !selectedFormat;

  // ============= ADD ELEMENTS =============

  const handleAddText = () => {
    const existingTextPositions = content.texts.map((t) => t.position);
    const newPosition = getNextAvailablePosition(existingTextPositions);

    const newText = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      fontSize: 100,
      color: '#ffffff',
      bgColor: 'transparent',
      bgOpacity: 0,
      position: newPosition,
      bgStyle: 'full-width' as const,
    };

    const newTexts = [...content.texts, newText];
    onContentChange({ ...content, texts: newTexts });

    // Auto-select immediately (no setTimeout needed)
    onElementSelect?.({ type: 'text', id: newText.id, index: newTexts.length - 1 });
  };

  const handleAddButton = () => {
    const newCTA = {
      id: `cta-${Date.now()}`,
      text: 'New Button',
    };

    const newCtas = [...content.ctas, newCTA];
    onContentChange({ ...content, ctas: newCtas });

    // Auto-select immediately
    onElementSelect?.({ type: 'cta', id: newCTA.id, index: newCtas.length - 1 });
  };

  const handleAddShape = (shapeType: 'rectangle' | 'circle' | 'triangle') => {
    const position = getNextShapePosition(content);

    const newShape = {
      id: `shape-${Date.now()}`,
      type: shapeType,
      color: '#3b82f6',
      opacity: 80,
      x: position.x,
      y: position.y,
      width: 200,
      height: shapeType === 'circle' ? 200 : 150,
      rotation: 0,
    };

    const newShapes = [...(content.shapes || []), newShape];
    onContentChange({ ...content, shapes: newShapes });

    // Auto-select immediately
    onElementSelect?.({ type: 'shape', id: newShape.id, index: newShapes.length - 1 });

    // Keep shapes menu expanded after adding
    setShapesExpanded(true);
  };

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          // Scale down to fit nicely in the canvas
          const maxDim = selectedFormat
            ? Math.min(selectedFormat.width, selectedFormat.height) * 0.4
            : 200;
          const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);

          // Offset based on existing images
          const existingImages = content.images || [];
          const offset = existingImages.length * 20;
          const x = 50 + offset;
          const y = 50 + offset;

          const newImage = {
            id: `img-${Date.now()}`,
            src: reader.result as string,
            opacity: 100,
            x,
            y,
            width: w,
            height: h,
            rotation: 0,
          };

          const newImages = [...existingImages, newImage];
          onContentChange({ ...content, images: newImages });
          onElementSelect?.({ type: 'image', id: newImage.id, index: newImages.length - 1 });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ============= EDIT CANVAS =============

  const handleEditBackground = () => {
    onElementSelect?.({ type: 'background' });
  };

  const handleEditLogo = () => {
    onElementSelect?.({ type: 'logo' });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold">Insert</h2>
        <p className="text-sm text-gray-500 mt-1">
          {isDisabled ? 'Select a banner to add elements' : 'Add elements or edit canvas'}
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6">
          {isDisabled ? (
            <div className="flex items-center justify-center h-64 text-center">
              <div className="max-w-xs">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Shapes className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Click on any banner to start adding elements
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ========== ADD ELEMENTS SECTION ========== */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Add Elements</h3>
                  <Badge variant="secondary" className="text-xs">
                    {content.texts.length +
                      content.ctas.length +
                      (content.shapes?.length || 0) +
                      (content.images?.length || 0)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {/* Add Text Button */}
                  <button
                    onClick={handleAddText}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Type className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">Text</div>
                      <div className="text-xs text-gray-500">Add text element</div>
                    </div>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                      {content.texts.length}
                    </Badge>
                  </button>

                  {/* Add Button (CTA) */}
                  <button
                    onClick={handleAddButton}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <MousePointer2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">Button</div>
                      <div className="text-xs text-gray-500">Add call-to-action</div>
                    </div>
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                      {content.ctas.length}
                    </Badge>
                  </button>

                  {/* Add Shapes - Expandable */}
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-pink-400 transition-all">
                    <button
                      onClick={() => setShapesExpanded(!shapesExpanded)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                        <Shapes className="h-5 w-5 text-pink-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900">Shapes</div>
                        <div className="text-xs text-gray-500">Add geometric shapes</div>
                      </div>
                      <Badge variant="outline" className="text-xs text-pink-600 border-pink-300">
                        {content.shapes?.length || 0}
                      </Badge>
                      {shapesExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {/* Shapes Menu */}
                    {shapesExpanded && (
                      <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
                        {/* Rectangle */}
                        <button
                          onClick={() => handleAddShape('rectangle')}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
                        >
                          <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center group-hover:bg-pink-200">
                            <Square className="h-4 w-4 text-pink-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Rectangle</span>
                          <Plus className="h-4 w-4 text-gray-400 ml-auto group-hover:text-pink-600" />
                        </button>

                        {/* Circle */}
                        <button
                          onClick={() => handleAddShape('circle')}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
                        >
                          <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center group-hover:bg-pink-200">
                            <Circle className="h-4 w-4 text-pink-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Circle</span>
                          <Plus className="h-4 w-4 text-gray-400 ml-auto group-hover:text-pink-600" />
                        </button>

                        {/* Triangle */}
                        <button
                          onClick={() => handleAddShape('triangle')}
                          className="w-full flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all group"
                        >
                          <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center group-hover:bg-pink-200">
                            <Triangle className="h-4 w-4 text-pink-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Triangle</span>
                          <Plus className="h-4 w-4 text-gray-400 ml-auto group-hover:text-pink-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Add Image */}
                  <button
                    onClick={handleAddImage}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <ImagePlus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">Image</div>
                      <div className="text-xs text-gray-500">Add image element</div>
                    </div>
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      {content.images?.length || 0}
                    </Badge>
                  </button>
                </div>
              </div>

              <Separator />

              {/* ========== EDIT CANVAS SECTION ========== */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Edit className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Edit Canvas</h3>
                </div>

                <div className="space-y-2">
                  {/* Edit Background */}
                  <button
                    onClick={handleEditBackground}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Image className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">Background</div>
                      <div className="text-xs text-gray-500">
                        {content.backgroundImage ? 'Image loaded' : 'No image'}
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                  </button>

                  {/* Edit Logo */}
                  <button
                    onClick={handleEditLogo}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors overflow-hidden">
                      {content.logo ? (
                        <img
                          src={content.logo}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Square className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">Logo</div>
                      <div className="text-xs text-gray-500">
                        {content.logo
                          ? `${content.logoSize}% • ${content.logoPosition}`
                          : 'No logo'}
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                  </button>
                </div>
              </div>

              {/* Smart Positioning Info */}
              <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <span>✨</span> Smart Positioning
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Next text:</span>
                    <span className="font-semibold capitalize">
                      {getNextAvailablePosition(content.texts.map((t) => t.position))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next button:</span>
                    <span className="font-semibold capitalize">{getNextCTAPosition(content)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shapes:</span>
                    <span className="font-semibold">Auto-offset</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
