import { useState } from 'react';
import { getNextAvailablePosition, getNextShapePosition } from '../utils/positioning';
import { resolveElementRect } from '../utils/group-helpers';
import { X, Crown, Sparkles, Group, Ungroup, Plus, Trash2, MousePointer2 } from 'lucide-react';
import { BannerContent, BannerFormat, SelectedElement, ElementGroup } from '../types/banner';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CTAEditor } from './CTAEditor';
import { TextEditor } from './TextEditor';
import { ShapeEditor } from './ShapeEditor';
import { BackgroundEditor } from './editors/BackgroundEditor';
import { LogoEditor } from './editors/LogoEditor';
import { ImageEditor } from './editors/ImageEditor';
import { LayersList } from './LayersList';

interface BannerEditorProps {
  selectedFormat: BannerFormat | null;
  isMaster: boolean;
  isSuperMaster?: boolean;
  content: BannerContent;
  onContentChange: (content: BannerContent) => void;
  onClose: () => void;
  selectedElement?: SelectedElement;
  onElementSelect?: (element: SelectedElement) => void;
  onSmartPosition?: () => void;
  // Multi-selection & group support
  multiSelectedIds?: string[];
  onGroupElements?: () => void;
  onUngroupElements?: (groupId: string) => void;
}

export function BannerEditor({
  selectedFormat,
  isMaster,
  isSuperMaster,
  content,
  onContentChange,
  onClose,
  selectedElement,
  onElementSelect,
  onSmartPosition,
  multiSelectedIds,
  onGroupElements,
  onUngroupElements,
}: BannerEditorProps) {
  const [activeTab, setActiveTab] = useState('content');

  // Helper: clean up groups when an element is deleted.
  // When a group drops below 2 members, dissolve it and convert
  // remaining member positions back from relative → absolute.
  const cleanupGroupsAfterDelete = (
    deletedId: string,
    newContent: BannerContent,
  ): BannerContent => {
    const groups = newContent.groups || [];
    if (groups.length === 0) return newContent;

    let result = { ...newContent };

    for (const group of groups) {
      const remaining = group.memberIds.filter((id) => id !== deletedId);
      if (remaining.length < 2) {
        // Dissolve: convert remaining members back to absolute positions
        const gx = group.x;
        const gy = group.y;
        remaining.forEach((memberId) => {
          if (memberId === 'logo') {
            result = {
              ...result,
              logoX: (result.logoX || 0) + gx,
              logoY: (result.logoY || 0) + gy,
            };
          } else {
            result.texts = result.texts.map((t) =>
              t.id === memberId ? { ...t, x: (t.x || 0) + gx, y: (t.y || 0) + gy } : t,
            );
            result.shapes = (result.shapes || []).map((s) =>
              s.id === memberId ? { ...s, x: (s.x || 0) + gx, y: (s.y || 0) + gy } : s,
            );
            result.images = (result.images || []).map((img) =>
              img.id === memberId ? { ...img, x: (img.x || 0) + gx, y: (img.y || 0) + gy } : img,
            );
          }
        });
      }
    }

    const updatedGroups = groups
      .map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== deletedId) }))
      .filter((g) => g.memberIds.length >= 2);
    result.groups = updatedGroups;
    return result;
  };

  const handleImageUpload = (file: File, type: 'background' | 'logo') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'background') {
        onContentChange({ ...content, backgroundImage: base64String });
      } else {
        onContentChange({ ...content, logo: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    // Get positions of existing texts
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
    onContentChange({ ...content, texts: [...content.texts, newText] });

    // Auto-select the new text
    if (onElementSelect) {
      onElementSelect({ type: 'text', id: newText.id, index: content.texts.length });
    }
  };

  const updateText = (index: number, updatedText: any) => {
    const newTexts = [...content.texts];
    newTexts[index] = updatedText;
    onContentChange({ ...content, texts: newTexts });
  };

  const deleteText = (index: number) => {
    const deletedId = content.texts[index]?.id;
    const newTexts = content.texts.filter((_, i) => i !== index);
    let newContent = { ...content, texts: newTexts };
    if (deletedId) newContent = cleanupGroupsAfterDelete(deletedId, newContent);
    onContentChange(newContent);

    // Deselect if deleting selected element
    if (selectedElement?.type === 'text' && selectedElement.index === index && onElementSelect) {
      onElementSelect({ type: 'background' });
    }
  };

  const addCTA = () => {
    const newCTA = {
      id: `cta-${Date.now()}`,
      text: 'New Button',
    };
    onContentChange({ ...content, ctas: [...content.ctas, newCTA] });

    // Auto-select the new CTA
    if (onElementSelect) {
      onElementSelect({ type: 'cta', id: newCTA.id, index: content.ctas.length });
    }
  };

  const updateCTA = (index: number, updatedCTA: any) => {
    const newCtas = [...content.ctas];
    newCtas[index] = updatedCTA;
    onContentChange({ ...content, ctas: newCtas });
  };

  const deleteCTA = (index: number) => {
    const deletedId = content.ctas[index]?.id;
    const newCtas = content.ctas.filter((_, i) => i !== index);
    let newContent = { ...content, ctas: newCtas };
    if (deletedId) newContent = cleanupGroupsAfterDelete(deletedId, newContent);
    onContentChange(newContent);

    // Deselect if deleting selected element
    if (selectedElement?.type === 'cta' && selectedElement.index === index && onElementSelect) {
      onElementSelect({ type: 'background' });
    }
  };

  const addShape = () => {
    const nextPos = getNextShapePosition(content);
    const newShape = {
      id: `shape-${Date.now()}`,
      type: 'rectangle' as const,
      color: '#3b82f6',
      opacity: 80,
      x: nextPos.x,
      y: nextPos.y,
      width: 200,
      height: 150,
      rotation: 0,
    };
    onContentChange({ ...content, shapes: [...(content.shapes || []), newShape] });

    // Auto-select the new shape
    if (onElementSelect) {
      onElementSelect({ type: 'shape', id: newShape.id, index: (content.shapes || []).length });
    }
  };

  const updateShape = (index: number, updatedShape: any) => {
    const newShapes = [...(content.shapes || [])];
    newShapes[index] = updatedShape;
    onContentChange({ ...content, shapes: newShapes });
  };

  const deleteShape = (index: number) => {
    const deletedId = (content.shapes || [])[index]?.id;
    const newShapes = (content.shapes || []).filter((_, i) => i !== index);
    let newContent = { ...content, shapes: newShapes };
    if (deletedId) newContent = cleanupGroupsAfterDelete(deletedId, newContent);
    onContentChange(newContent);

    // Deselect if deleting selected element
    if (selectedElement?.type === 'shape' && selectedElement.index === index && onElementSelect) {
      onElementSelect({ type: 'background' });
    }
  };

  const updateImage = (index: number, updatedImage: any) => {
    const newImages = [...(content.images || [])];
    newImages[index] = updatedImage;
    onContentChange({ ...content, images: newImages });
  };

  const deleteImage = (index: number) => {
    const deletedId = (content.images || [])[index]?.id;
    const newImages = (content.images || []).filter((_, i) => i !== index);
    let newContent = { ...content, images: newImages };
    if (deletedId) newContent = cleanupGroupsAfterDelete(deletedId, newContent);
    onContentChange(newContent);
    if (selectedElement?.type === 'image' && selectedElement.index === index && onElementSelect) {
      onElementSelect({ type: 'background' });
    }
  };

  const handleGradientChange = (field: string, value: any) => {
    onContentChange({
      ...content,
      ctaGradient: {
        ...content.ctaGradient,
        [field]: value,
      },
    });
  };

  const handleShadowChange = (field: string, value: any) => {
    onContentChange({
      ...content,
      ctaShadow: {
        ...content.ctaShadow,
        [field]: value,
      },
    });
  };

  if (!selectedFormat) {
    return (
      <div className="w-80 border-l bg-gray-50 shadow-lg flex items-center justify-center">
        <p className="text-sm text-gray-500 text-center">
          Click on a banner to edit its properties
        </p>
      </div>
    );
  }

  // Render element-specific editor when an element is selected
  const renderElementEditor = () => {
    if (!selectedElement) return null;

    switch (selectedElement.type) {
      case 'background':
        return (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700">🎨 Background Selected</p>
              <p className="text-xs text-blue-600 mt-1">Edit the background image and position</p>
            </div>

            <BackgroundEditor content={content} onContentChange={onContentChange} />

            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-4"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );

      case 'logo':
        return (
          <div className="p-4 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-purple-700">🏷️ Logo Selected</p>
              <p className="text-xs text-purple-600 mt-1">Edit logo image, size, and position</p>
            </div>

            <LogoEditor content={content} onContentChange={onContentChange} />

            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-4"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );

      case 'text': {
        const textIndex = selectedElement.index;
        const text = content.texts[textIndex];
        if (!text) return null;

        return (
          <div className="p-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-green-700">
                📝 Text {textIndex + 1} Selected
              </p>
              <p className="text-xs text-green-600 mt-1">"{text.text}"</p>
            </div>

            <TextEditor
              text={text}
              index={textIndex}
              onTextChange={updateText}
              onDeleteText={deleteText}
              onElementSelect={onElementSelect}
            />

            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );
      }

      case 'cta': {
        const ctaIndex = selectedElement.index;
        const cta = content.ctas[ctaIndex];
        if (!cta) return null;

        return (
          <div className="p-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-700">
                    🎯 CTA {ctaIndex + 1} Selected
                  </p>
                  <p className="text-xs text-orange-600 mt-1">"{cta.text}"</p>
                </div>
                <button
                  className="text-xs text-orange-500 hover:text-orange-700 px-2 py-1 rounded border border-orange-300 hover:bg-orange-100 transition-colors"
                  onClick={() => onElementSelect?.({ type: 'cta-group' })}
                  title="Back to CTA Group"
                >
                  Group
                </button>
              </div>
            </div>

            <CTAEditor
              cta={cta}
              index={ctaIndex}
              onChange={updateCTA}
              onDelete={deleteCTA}
              canDelete={content.ctas.length > 1}
              onElementSelect={onElementSelect}
              content={content}
              onContentChange={onContentChange}
            />

            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );
      }

      case 'shape': {
        const shapeIndex = selectedElement.index;
        const shape = (content.shapes || [])[shapeIndex];
        if (!shape) return null;

        return (
          <div className="p-4 space-y-4">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-pink-700">
                🔷 Shape {shapeIndex + 1} Selected
              </p>
              <p className="text-xs text-pink-600 mt-1 capitalize">{shape.type}</p>
            </div>

            <ShapeEditor
              shape={shape}
              index={shapeIndex}
              onChange={updateShape}
              onDelete={deleteShape}
              onElementSelect={onElementSelect}
            />

            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );
      }

      case 'image': {
        const imageIndex = selectedElement.index;
        const image = (content.images || [])[imageIndex];
        if (!image) return null;

        return (
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-700">
                🖼️ Image {imageIndex + 1} Selected
              </p>
              <p className="text-xs text-gray-600 mt-1">Edit image properties</p>
            </div>

            <ImageEditor
              image={image}
              index={imageIndex}
              onChange={updateImage}
              onDelete={deleteImage}
              onElementSelect={onElementSelect}
            />

            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );
      }

      case 'cta-group':
        return (
          <div className="p-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-orange-700">
                {content.ctas.length === 1
                  ? '🎯 CTA Button'
                  : `🎯 CTA Group (${content.ctas.length})`}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {content.ctas.length === 1
                  ? 'Position your call-to-action button'
                  : 'Drag to reposition all CTAs as a group'}
              </p>
            </div>

            {/* ── CTA Members ── */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {content.ctas.length === 1 ? 'Button' : 'Buttons'}
              </h4>
              <div className="space-y-1">
                {content.ctas.map((cta, idx) => (
                  <div
                    key={cta.id}
                    className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors group"
                  >
                    <MousePointer2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-700 truncate">
                      {content.ctas.length > 1 ? `${idx + 1}. ` : ''}&ldquo;{cta.text}&rdquo;
                    </span>
                    <button
                      className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                      onClick={() => onElementSelect?.({ type: 'cta', id: cta.id, index: idx })}
                    >
                      Edit
                    </button>
                    {content.ctas.length > 1 && (
                      <button
                        className="text-xs text-red-400 hover:text-red-600 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete CTA"
                        onClick={() => deleteCTA(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs gap-1.5"
                onClick={addCTA}
              >
                <Plus className="h-3 w-3" />
                Add CTA
              </Button>
            </div>

            {/* ── Position ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Position
              </h4>
              {content.ctaGroupX !== undefined && content.ctaGroupY !== undefined ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">X</label>
                      <input
                        type="number"
                        value={content.ctaGroupX}
                        onChange={(e) =>
                          onContentChange({ ...content, ctaGroupX: parseInt(e.target.value) || 0 })
                        }
                        className="w-full border rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Y</label>
                      <input
                        type="number"
                        value={content.ctaGroupY}
                        onChange={(e) =>
                          onContentChange({ ...content, ctaGroupY: parseInt(e.target.value) || 0 })
                        }
                        className="w-full border rounded px-2 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      const { ctaGroupX, ctaGroupY, ...rest } = content;
                      onContentChange(rest as BannerContent);
                    }}
                  >
                    Reset to preset ({content.ctaPosition})
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Preset: <span className="font-medium capitalize">{content.ctaPosition}</span>.
                  Drag on canvas for custom position.
                </p>
              )}
            </div>

            {/* ── Preset Position ── */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Quick Position
              </h4>
              <div className="grid grid-cols-3 gap-1">
                {(['top', 'center', 'bottom', 'left', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    className={`px-2 py-1.5 text-xs rounded border capitalize transition-colors ${
                      content.ctaPosition === pos && !content.ctaGroupX
                        ? 'bg-orange-100 border-orange-400 text-orange-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      const { ctaGroupX, ctaGroupY, ...rest } = content;
                      onContentChange({ ...rest, ctaPosition: pos } as BannerContent);
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-4"
              onClick={() => onElementSelect?.(null)}
            >
              Back to Layers
            </Button>
          </div>
        );

      case 'group':
        return (() => {
          const groups = content.groups || [];
          const group = groups.find((g) => g.id === selectedElement.id);
          if (!group) return null;

          // Resolve member names
          const memberNames = group.memberIds.map((memberId) => {
            if (memberId === 'logo') return 'Logo';
            const txt = content.texts.find((t) => t.id === memberId);
            if (txt) return `Text: "${txt.text.slice(0, 20)}${txt.text.length > 20 ? '...' : ''}"`;
            const shp = (content.shapes || []).find((s) => s.id === memberId);
            if (shp) return `Shape: ${shp.type}`;
            const img = (content.images || []).find((i) => i.id === memberId);
            if (img) return `Image: ${img.width}x${img.height}`;
            return memberId;
          });

          return (
            <div className="p-4 space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-teal-700">{group.name}</p>
                <p className="text-xs text-teal-600 mt-1">
                  {group.memberIds.length} elements. Drag the group container to move all.
                </p>
              </div>

              {/* Group position */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Position
                </h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(group.x)}
                      onChange={(e) => {
                        const updatedGroups = groups.map((g) =>
                          g.id === group.id ? { ...g, x: parseInt(e.target.value) || 0 } : g,
                        );
                        onContentChange({ ...content, groups: updatedGroups });
                      }}
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(group.y)}
                      onChange={(e) => {
                        const updatedGroups = groups.map((g) =>
                          g.id === group.id ? { ...g, y: parseInt(e.target.value) || 0 } : g,
                        );
                        onContentChange({ ...content, groups: updatedGroups });
                      }}
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">W</label>
                    <input
                      type="number"
                      value={Math.round(group.width)}
                      onChange={(e) => {
                        const updatedGroups = groups.map((g) =>
                          g.id === group.id ? { ...g, width: parseInt(e.target.value) || 10 } : g,
                        );
                        onContentChange({ ...content, groups: updatedGroups });
                      }}
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">H</label>
                    <input
                      type="number"
                      value={Math.round(group.height)}
                      onChange={(e) => {
                        const updatedGroups = groups.map((g) =>
                          g.id === group.id ? { ...g, height: parseInt(e.target.value) || 10 } : g,
                        );
                        onContentChange({ ...content, groups: updatedGroups });
                      }}
                      className="w-full border rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Group name editor */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Group Name
                </h4>
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => {
                    const updatedGroups = groups.map((g) =>
                      g.id === group.id ? { ...g, name: e.target.value } : g,
                    );
                    onContentChange({ ...content, groups: updatedGroups });
                  }}
                  className="w-full border rounded px-2 py-1.5 text-xs"
                />
              </div>

              {/* Members list */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Members
                </h4>
                <div className="space-y-1">
                  {memberNames.map((name, i) => {
                    const memberId = group.memberIds[i];
                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-700"
                      >
                        <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                        <span className="flex-1 truncate">{name}</span>
                        {/* Click to select individual member */}
                        <button
                          className="text-blue-500 hover:text-blue-700 text-xs px-1"
                          title="Select element"
                          onClick={() => {
                            if (!onElementSelect) return;
                            if (memberId === 'logo') {
                              onElementSelect({ type: 'logo' });
                              return;
                            }
                            const txtIdx = content.texts.findIndex((t) => t.id === memberId);
                            if (txtIdx >= 0) {
                              onElementSelect({ type: 'text', id: memberId, index: txtIdx });
                              return;
                            }
                            const shpIdx = (content.shapes || []).findIndex(
                              (s) => s.id === memberId,
                            );
                            if (shpIdx >= 0) {
                              onElementSelect({ type: 'shape', id: memberId, index: shpIdx });
                              return;
                            }
                            const imgIdx = (content.images || []).findIndex(
                              (i) => i.id === memberId,
                            );
                            if (imgIdx >= 0) {
                              onElementSelect({ type: 'image', id: memberId, index: imgIdx });
                              return;
                            }
                          }}
                        >
                          Edit
                        </button>
                        {/* Remove from group — convert position back to absolute */}
                        {group.memberIds.length > 2 && (
                          <button
                            className="text-red-400 hover:text-red-600 text-xs px-1"
                            title="Remove from group"
                            onClick={() => {
                              const gx = group.x,
                                gy = group.y;
                              let updated = { ...content };
                              // Convert the removed member's position back to absolute
                              if (memberId === 'logo') {
                                updated = {
                                  ...updated,
                                  logoX: (updated.logoX || 0) + gx,
                                  logoY: (updated.logoY || 0) + gy,
                                };
                              } else {
                                updated.texts = updated.texts.map((t) =>
                                  t.id === memberId
                                    ? { ...t, x: (t.x || 0) + gx, y: (t.y || 0) + gy }
                                    : t,
                                );
                                updated.shapes = (updated.shapes || []).map((s) =>
                                  s.id === memberId
                                    ? { ...s, x: (s.x || 0) + gx, y: (s.y || 0) + gy }
                                    : s,
                                );
                                updated.images = (updated.images || []).map((img) =>
                                  img.id === memberId
                                    ? { ...img, x: (img.x || 0) + gx, y: (img.y || 0) + gy }
                                    : img,
                                );
                              }
                              const updatedMembers = group.memberIds.filter(
                                (id) => id !== memberId,
                              );
                              const updatedGroups = (groups || []).map((g) =>
                                g.id === group.id ? { ...g, memberIds: updatedMembers } : g,
                              );
                              updated.groups = updatedGroups;
                              onContentChange(updated);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add element to group */}
              {(() => {
                // Find elements NOT in any group
                const allGroupedIds = new Set((groups || []).flatMap((g) => g.memberIds));
                const ungrouped: { id: string; label: string }[] = [];
                if (content.logo && !allGroupedIds.has('logo'))
                  ungrouped.push({ id: 'logo', label: 'Logo' });
                content.texts.forEach((t) => {
                  if (!allGroupedIds.has(t.id))
                    ungrouped.push({ id: t.id, label: `Text: "${t.text.slice(0, 18)}"` });
                });
                (content.shapes || []).forEach((s) => {
                  if (!allGroupedIds.has(s.id))
                    ungrouped.push({ id: s.id, label: `Shape: ${s.type}` });
                });
                (content.images || []).forEach((img) => {
                  if (!allGroupedIds.has(img.id))
                    ungrouped.push({ id: img.id, label: `Image: ${img.width}x${img.height}` });
                });
                if (ungrouped.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Add to Group
                    </h4>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {ungrouped.map((item) => (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 bg-white border border-dashed border-gray-300 rounded text-xs text-gray-600 hover:border-teal-400 hover:text-teal-700 transition-colors"
                          onClick={() => {
                            if (!selectedFormat) return;
                            // Resolve the new member's absolute position
                            const rect = resolveElementRect(item.id, content, selectedFormat);
                            if (!rect) return;
                            // Convert to relative (subtract group origin)
                            const gx = group.x,
                              gy = group.y;
                            let updated = { ...content };
                            if (item.id === 'logo') {
                              updated = { ...updated, logoX: rect.x - gx, logoY: rect.y - gy };
                            } else {
                              updated.texts = updated.texts.map((t) =>
                                t.id === item.id
                                  ? {
                                      ...t,
                                      x: rect.x - gx,
                                      y: rect.y - gy,
                                      width: t.width || rect.width,
                                    }
                                  : t,
                              );
                              updated.shapes = (updated.shapes || []).map((s) =>
                                s.id === item.id ? { ...s, x: rect.x - gx, y: rect.y - gy } : s,
                              );
                              updated.images = (updated.images || []).map((img) =>
                                img.id === item.id
                                  ? { ...img, x: rect.x - gx, y: rect.y - gy }
                                  : img,
                              );
                            }
                            // Expand group bounding box if needed
                            const newRight = rect.x - gx + rect.width;
                            const newBottom = rect.y - gy + rect.height;
                            const expandW = Math.max(group.width, newRight + 4);
                            const expandH = Math.max(group.height, newBottom + 4);
                            const updatedMembers = [...group.memberIds, item.id];
                            const updatedGroups = (groups || []).map((g) =>
                              g.id === group.id
                                ? {
                                    ...g,
                                    memberIds: updatedMembers,
                                    width: expandW,
                                    height: expandH,
                                  }
                                : g,
                            );
                            updated.groups = updatedGroups;
                            onContentChange(updated);
                          }}
                        >
                          <span className="w-2 h-2 rounded-full border border-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto text-teal-500">+</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-gray-400 italic">
                Tip: Ctrl+Shift+G to ungroup. The group is a real container — elements stay together
                on export.
              </p>

              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-4"
                onClick={() => onElementSelect?.(null)}
              >
                Back to Layers
              </Button>
            </div>
          );
        })();

      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l bg-white shadow-lg flex flex-col h-full min-h-0">
      {/* Header - Fixed height */}
      <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{selectedFormat.name}</h3>
              {isMaster && (
                <Badge variant="default" className="text-xs gap-1">
                  <Crown className="h-3 w-3" />
                  Master
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {selectedFormat.width} × {selectedFormat.height}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {isMaster && (
          <p className="text-xs text-blue-600 mt-2">
            {isSuperMaster
              ? '🌟 Changes here will affect ALL banners across all columns'
              : 'Changes here will affect all child banners in this column'}
          </p>
        )}
        {/* Smart Layout Button */}
        {onSmartPosition && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 gap-2 text-xs"
            onClick={onSmartPosition}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Smart Layout This Banner
          </Button>
        )}
        {/* Group/Un-group Buttons */}
        {multiSelectedIds && multiSelectedIds.length > 1 && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={onGroupElements}
            >
              <Group className="h-3.5 w-3.5" />
              Group Selected Elements
            </Button>
          </div>
        )}
        {selectedElement && selectedElement.type === 'group' && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => onUngroupElements?.(selectedElement.id)}
            >
              <Ungroup className="h-3.5 w-3.5" />
              Ungroup Elements
            </Button>
          </div>
        )}
      </div>

      {/* Show element-specific editor if an element is selected, otherwise show layers list */}
      {selectedElement ? (
        <ScrollArea className="flex-1 min-h-0">{renderElementEditor()}</ScrollArea>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Multi-selection info banner */}
          {multiSelectedIds && multiSelectedIds.length > 0 && (
            <div className="p-3 bg-teal-50 border-b border-teal-200">
              <p className="text-xs font-semibold text-teal-700">
                {multiSelectedIds.length} element{multiSelectedIds.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-teal-600 mt-1">
                Shift+click to add more.{' '}
                {multiSelectedIds.length >= 2 ? 'Ctrl+G to group.' : 'Select at least 2 to group.'}
              </p>
            </div>
          )}
          <LayersList
            content={content}
            selectedElement={selectedElement}
            onElementSelect={onElementSelect || (() => {})}
            onContentChange={onContentChange}
            multiSelectedIds={multiSelectedIds}
          />
        </div>
      )}
    </div>
  );
}
