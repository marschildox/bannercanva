import { forwardRef, useRef, useState, useEffect } from 'react';
import React from 'react';
import { BannerContent, BannerFormat, SelectedElement, ElementGroup } from '../types/banner';
import { Settings, Trash2, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FixedScale } from './FixedScale';
import { TransformBox } from './TransformBox';

// Helper function to convert hex color and opacity to rgba
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Selection overlay — renders a highlight ring around an element.
// Always marked with data-export-ignore so it's stripped from exports.
// ═══════════════════════════════════════════════════════════════════════════════
function SelectionOverlay({
  active,
  x,
  y,
  width,
  height,
  rotation = 0,
  inset = false,
  offset = false,
}: {
  active: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  inset?: boolean;
  offset?: boolean;
}) {
  if (!active) return null;

  const shadow = offset
    ? '0 0 0 2px #ffffff, 0 0 0 4px #3b82f6' // ring-offset-2
    : inset
      ? 'inset 0 0 0 2px #3b82f6' // ring-inset
      : '0 0 0 2px #3b82f6'; // plain ring

  const style: React.CSSProperties = {
    position: 'absolute',
    boxShadow: shadow,
    pointerEvents: 'none',
    borderRadius: offset ? '4px' : undefined,
    // Specific positioning (for shapes, logo, etc.)
    ...(x !== undefined ? { left: `${x}px` } : { left: 0 }),
    ...(y !== undefined ? { top: `${y}px` } : { top: 0 }),
    ...(width !== undefined ? { width: `${width}px` } : { right: 0 }),
    ...(height !== undefined ? { height: `${height}px` } : { bottom: 0 }),
    ...(rotation
      ? {
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
        }
      : {}),
  };

  return <div data-export-ignore style={style} />;
}

interface BannerCanvasProps {
  id: string;
  format: BannerFormat;
  content: BannerContent;
  isMaster?: boolean;
  isSuperMaster?: boolean;
  isActive?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  zoom?: number;
  selectedElement?: SelectedElement;
  onElementSelect?: (element: SelectedElement) => void;
  onContentUpdate?: (content: Partial<BannerContent>) => void;
  // Multi-selection & group support
  multiSelectedIds?: string[];
  onMultiSelect?: (elementId: string) => void;
}

export const BannerCanvas = forwardRef<HTMLDivElement, BannerCanvasProps>(
  (
    {
      id,
      format,
      content,
      isMaster = false,
      isSuperMaster = false,
      isActive = false,
      onSelect,
      onDelete,
      isSelected = false,
      zoom = 1,
      selectedElement,
      onElementSelect,
      onContentUpdate,
      multiSelectedIds,
      onMultiSelect,
    },
    ref,
  ) => {
    const isEditing = isSelected && selectedElement != null;

    const safeContent = {
      ...content,
      shapes: content.shapes || [],
      ctas: content.ctas || [],
      texts: content.texts || [],
      images: content.images || [],
    };

    const groups: ElementGroup[] = content.groups || [];

    // ═════════════════════════════════════════════════════════════════
    // Group helpers
    // ═════════════════════════════════════════════════════════════════
    // Set of all element IDs that belong to any group.
    // These elements are NOT rendered individually — they render
    // inside their group's DOM container instead.
    const groupedElementIds = new Set<string>(groups.flatMap((g) => g.memberIds));

    const findGroupForElement = (elementId: string): ElementGroup | undefined =>
      groups.find((g) => g.memberIds.includes(elementId));

    const isElementMultiSelected = (elementId: string): boolean =>
      (multiSelectedIds || []).includes(elementId);

    const isGroupSelected = (groupId: string): boolean =>
      selectedElement?.type === 'group' && selectedElement.id === groupId;

    // Drag state — supports text, shape, logo, cta-group, and group drag
    const [draggingElement, setDraggingElement] = useState<{
      type: 'text' | 'shape' | 'image' | 'logo' | 'cta' | 'cta-group' | 'group';
      id: string;
      startX: number;
      startY: number;
      elemX: number;
      elemY: number;
    } | null>(null);

    const textRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const ctaRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const ctaGroupRef = useRef<HTMLDivElement | null>(null);
    const logoRef = useRef<HTMLDivElement | null>(null);

    // ════════════════════════════════════════════════════════════════
    // Click handling — group-aware
    // ═════════════════════════════════════════════════════════════════
    const handleElementClick = (element: SelectedElement, e?: React.MouseEvent) => {
      if (!isSelected) {
        if (onSelect) onSelect();
        return;
      }

      // Shift+click → multi-select toggle
      if (
        e?.shiftKey &&
        onMultiSelect &&
        element &&
        element.type !== 'background' &&
        element.type !== 'cta-group'
      ) {
        const elemId = element.type === 'logo' ? 'logo' : 'id' in element ? element.id : '';
        if (elemId) {
          onMultiSelect(elemId);
          return;
        }
      }

      // Normal click on an element that belongs to a group → select the GROUP
      if (
        element &&
        element.type !== 'background' &&
        element.type !== 'cta-group' &&
        element.type !== 'group'
      ) {
        const elemId = element.type === 'logo' ? 'logo' : 'id' in element ? element.id : '';
        const group = findGroupForElement(elemId);
        if (group) {
          if (onElementSelect) onElementSelect({ type: 'group', id: group.id });
          return;
        }
      }

      if (onElementSelect) onElementSelect(element);
    };

    const handleBannerClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && onSelect) onSelect();
    };

    const displayWidth = format.width;
    const displayHeight = format.height;

    const baseFontSize = Math.min(format.width, format.height) * 0.08;
    const logoSize = baseFontSize * 3 * (safeContent.logoSize / 100);

    const getDefaultTextPosition = (textElement: any, textFontSize: number, paddingY: number) => {
      const elementHeight = textFontSize * 1.2 + paddingY * 2;
      if (textElement.x !== undefined && textElement.y !== undefined) {
        return { x: textElement.x, y: textElement.y };
      }
      let y: number;
      switch (textElement.position) {
        case 'top':
          y = format.height * 0.2 - elementHeight / 2;
          break;
        case 'bottom':
          y = format.height * 0.8 - elementHeight / 2;
          break;
        default:
          y = format.height * 0.5 - elementHeight / 2;
      }
      return { x: 0, y };
    };

    const getLogoDefaultPosition = (): { x: number; y: number } => {
      if (safeContent.logoX !== undefined && safeContent.logoY !== undefined) {
        return { x: safeContent.logoX, y: safeContent.logoY };
      }
      const margin = Math.round(Math.min(format.width, format.height) * 0.05);
      const effectiveLogoW = safeContent.logoWidth || logoSize;
      const effectiveLogoH = safeContent.logoHeight || logoSize;
      const pos = safeContent.logoPosition || 'top-left';
      let x = margin;
      let y = margin;
      if (pos.includes('right')) x = format.width - effectiveLogoW - margin;
      if (pos.includes('bottom')) y = format.height - effectiveLogoH - margin;
      if (pos === 'center') {
        x = (format.width - effectiveLogoW) / 2;
        y = (format.height - effectiveLogoH) / 2;
      }
      if (pos === 'top') {
        x = (format.width - effectiveLogoW) / 2;
        y = margin;
      }
      if (pos === 'bottom') {
        x = (format.width - effectiveLogoW) / 2;
        y = format.height - effectiveLogoH - margin;
      }
      return { x: Math.round(x), y: Math.round(y) };
    };

    const handleTextMouseDown = (e: React.MouseEvent, textElement: any, index: number) => {
      if (!isSelected) return;
      e.preventDefault();
      e.stopPropagation();
      const textFontSize = Math.round(baseFontSize * (textElement.fontSize / 100));
      const paddingY = Math.round(textElement.paddingY || 8);
      const { x, y } = getDefaultTextPosition(textElement, textFontSize, paddingY);

      setDraggingElement({
        type: 'text',
        id: textElement.id,
        startX: e.clientX,
        startY: e.clientY,
        elemX: x,
        elemY: y,
      });
      handleElementClick({ type: 'text', id: textElement.id, index }, e);
    };

    const handleShapeMouseDown = (e: React.MouseEvent, shape: any, index: number) => {
      if (!isSelected) return;
      e.preventDefault();
      e.stopPropagation();
      setDraggingElement({
        type: 'shape',
        id: shape.id,
        startX: e.clientX,
        startY: e.clientY,
        elemX: shape.x || 0,
        elemY: shape.y || 0,
      });
      handleElementClick({ type: 'shape', id: shape.id, index }, e);
    };

    const handleLogoMouseDown = (e: React.MouseEvent) => {
      if (!isSelected) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = getLogoDefaultPosition();
      setDraggingElement({
        type: 'logo',
        id: 'logo',
        startX: e.clientX,
        startY: e.clientY,
        elemX: pos.x,
        elemY: pos.y,
      });
      handleElementClick({ type: 'logo' }, e);
    };

    // ═════════════════════════════════════════════════════════════════
    // Group container mousedown — just drags group.x / group.y
    // Members keep their relative positions inside the container.
    // ═════════════════════════════════════════════════════════════════
    const handleGroupMouseDown = (e: React.MouseEvent, group: ElementGroup) => {
      if (!isSelected) return;
      e.preventDefault();
      e.stopPropagation();
      setDraggingElement({
        type: 'group',
        id: group.id,
        startX: e.clientX,
        startY: e.clientY,
        elemX: group.x,
        elemY: group.y,
      });
      if (onElementSelect) onElementSelect({ type: 'group', id: group.id });
    };

    useEffect(() => {
      if (!draggingElement) return;
      const onMove = (e: MouseEvent) => {
        if (!onContentUpdate) return;
        const deltaX = (e.clientX - draggingElement.startX) / zoom;
        const deltaY = (e.clientY - draggingElement.startY) / zoom;
        const newX = Math.round(draggingElement.elemX + deltaX);
        const newY = Math.round(draggingElement.elemY + deltaY);
        if (draggingElement.type === 'text') {
          const currentTexts = content.texts || [];
          const updatedTexts = currentTexts.map((t) => {
            if (t.id !== draggingElement.id) return t;
            const bgStyle = t.bgStyle || 'full-width';
            const isFullWidthText = !t.width && bgStyle !== 'inline';
            return { ...t, x: isFullWidthText ? 0 : newX, y: newY };
          });
          onContentUpdate({ texts: updatedTexts });
        } else if (draggingElement.type === 'shape') {
          const updatedShapes = (content.shapes || []).map((s) =>
            s.id === draggingElement.id ? { ...s, x: newX, y: newY } : s,
          );
          onContentUpdate({ shapes: updatedShapes });
        } else if (draggingElement.type === 'image') {
          const updatedImages = (content.images || []).map((img) =>
            img.id === draggingElement.id ? { ...img, x: newX, y: newY } : img,
          );
          onContentUpdate({ images: updatedImages });
        } else if (draggingElement.type === 'logo') {
          onContentUpdate({ logoX: newX, logoY: newY });
        } else if (draggingElement.type === 'cta-group') {
          onContentUpdate({ ctaGroupX: newX, ctaGroupY: newY });
        } else if (draggingElement.type === 'group') {
          // Move the group container — members keep their relative positions
          const updatedGroups = (content.groups || []).map((g) =>
            g.id === draggingElement.id ? { ...g, x: newX, y: newY } : g,
          );
          onContentUpdate({ groups: updatedGroups });
        }
      };
      const onUp = () => setDraggingElement(null);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, [
      draggingElement,
      zoom,
      content.texts,
      content.shapes,
      content.images,
      content.groups,
      content.ctaGroupX,
      content.ctaGroupY,
      onContentUpdate,
    ]);

    // ════════��════════════════════════════════════════════════════════
    // Font weight map
    // ═════════════════════════════════════════════════════════════════
    const fontWeightMap: Record<string, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    };

    return (
      <div className="group relative" data-banner-id={id}>
        {/* ─── Selection wrapper (border / ring lives here, OUTSIDE canvas) ─── */}
        <div
          className={`bg-white shadow-md rounded-lg overflow-hidden transition-all ${
            isEditing
              ? 'border-4 border-blue-500 ring-4 ring-blue-200 cursor-auto'
              : isActive
                ? 'border-4 border-orange-400 ring-4 ring-orange-200 cursor-pointer hover:border-orange-500'
                : 'border-2 border-gray-200 hover:border-gray-400 cursor-pointer'
          }`}
          style={{
            width: `${displayWidth * zoom}px`,
            height: `${displayHeight * zoom}px`,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'auto',
          }}
          onClick={handleBannerClick}
        >
          {/* ═════════════════════════════════════════════════════════════════
              CANVAS — This is the export target.
              *** NO Tailwind classes inside here ***
              Everything uses inline styles so html2canvas sees a clean DOM.
              ═════════════════════════════════════════════════════════════════ */}
          <div
            id={id}
            ref={ref}
            style={{
              width: `${format.width}px`,
              height: `${format.height}px`,
              position: 'relative',
              overflow: 'hidden',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              pointerEvents: isActive ? 'auto' : 'none',
              opacity: isActive ? 1 : 0.85,
              backgroundColor: '#ffffff',
              // Explicit font properties ensure predictable inheritance for
              // child elements that use `font-family: inherit`. Without these,
              // the off-screen clone might inherit different fonts from body,
              // causing metric differences vs the live preview.
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '16px',
              lineHeight: '1.5',
              color: '#000000',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            {/* ─── Background Image ─── */}
            {/* Uses CSS background-image (html2canvas has native support for
                background-size: cover / background-position).
                A hidden <img crossOrigin="anonymous"> pre-warms the browser's
                CORS cache so html2canvas can re-fetch the same URL with CORS. */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleElementClick({ type: 'background' });
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${format.width}px`,
                height: `${format.height}px`,
                backgroundImage: `url(${safeContent.backgroundImage})`,
                backgroundPosition: safeContent.backgroundPosition || 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            />
            {/* Hidden CORS pre-loader – warms the browser cache with a
                CORS-enabled response so html2canvas's useCORS fetch succeeds. */}
            <img
              src={safeContent.backgroundImage}
              alt=""
              crossOrigin="anonymous"
              data-cors-preload
              style={{ display: 'none' }}
            />
            {/* Background selection overlay */}
            <SelectionOverlay active={selectedElement?.type === 'background'} inset />

            {/* ─── Background-layer shapes (isBackground=true, lowest z-order) ─── */}
            {safeContent.shapes.map((shape, index) => {
              if (!shape.isBackground) return null;
              if (groupedElementIds.has(shape.id)) return null;
              const isShapeSelected =
                selectedElement?.type === 'shape' && selectedElement.id === shape.id;
              const shapeX = shape.x || 0;
              const shapeY = shape.y || 0;
              const shapeWidth = shape.width || 100;
              const shapeHeight = shape.height || 100;
              const shapeRotation = shape.rotation || 0;
              const renderBgShape = () => {
                const shapeColor = hexToRgba(shape.color, shape.opacity);
                switch (shape.type) {
                  case 'rectangle':
                    return (
                      <div style={{ width: '100%', height: '100%', backgroundColor: shapeColor }} />
                    );
                  case 'circle':
                    return (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: shapeColor,
                          borderRadius: '50%',
                        }}
                      />
                    );
                  case 'triangle':
                    return (
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <polygon points="50,10 90,90 10,90" fill={shapeColor} />
                      </svg>
                    );
                  default:
                    return null;
                }
              };
              return (
                <div key={`bg-${shape.id}`}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingElement)
                        handleElementClick({ type: 'shape', id: shape.id, index }, e);
                    }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape, index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onElementSelect) onElementSelect({ type: 'shape', id: shape.id, index });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${shapeX}px`,
                      top: `${shapeY}px`,
                      width: `${shapeWidth}px`,
                      height: `${shapeHeight}px`,
                      transform: `rotate(${shapeRotation}deg)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'auto',
                      cursor: isSelected ? 'move' : 'pointer',
                    }}
                  >
                    {renderBgShape()}
                  </div>
                  <SelectionOverlay
                    active={!!isShapeSelected}
                    x={shapeX}
                    y={shapeY}
                    width={shapeWidth}
                    height={shapeHeight}
                    rotation={shapeRotation}
                  />
                  {isShapeSelected && isSelected && (
                    <TransformBox
                      x={shapeX}
                      y={shapeY}
                      width={shapeWidth}
                      height={shapeHeight}
                      rotation={shapeRotation}
                      zoom={zoom}
                      isActive={true}
                      onTransform={(params) => {
                        if (!onContentUpdate) return;
                        const updatedShapes = safeContent.shapes.map((s) =>
                          s.id === shape.id
                            ? {
                                ...s,
                                x: params.x !== undefined ? params.x : shapeX,
                                y: params.y !== undefined ? params.y : shapeY,
                                width: params.width !== undefined ? params.width : shapeWidth,
                                height: params.height !== undefined ? params.height : shapeHeight,
                                rotation:
                                  params.rotation !== undefined ? params.rotation : shapeRotation,
                              }
                            : s,
                        );
                        onContentUpdate({ shapes: updatedShapes });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* ─── Background-layer images (isBackground=true, before foreground) ─── */}
            {safeContent.images.map((imgEl, index) => {
              if (!imgEl.isBackground) return null;
              if (groupedElementIds.has(imgEl.id)) return null;
              const isImgSelected =
                selectedElement?.type === 'image' && selectedElement.id === imgEl.id;
              const imgX = imgEl.x || 0;
              const imgY = imgEl.y || 0;
              const imgW = imgEl.width || 200;
              const imgH = imgEl.height || 200;
              const imgRotation = imgEl.rotation || 0;
              const imgOpacity = (imgEl.opacity ?? 100) / 100;
              return (
                <div key={`bg-${imgEl.id}`}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingElement)
                        handleElementClick({ type: 'image', id: imgEl.id, index }, e);
                    }}
                    onMouseDown={(e) => {
                      if (!isSelected) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingElement({
                        type: 'image',
                        id: imgEl.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        elemX: imgX,
                        elemY: imgY,
                      });
                      handleElementClick({ type: 'image', id: imgEl.id, index }, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onElementSelect) onElementSelect({ type: 'image', id: imgEl.id, index });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${imgX}px`,
                      top: `${imgY}px`,
                      width: `${imgW}px`,
                      height: `${imgH}px`,
                      transform: imgRotation ? `rotate(${imgRotation}deg)` : undefined,
                      transformOrigin: 'center center',
                      pointerEvents: 'auto',
                      cursor: isSelected ? 'move' : 'pointer',
                      opacity: imgOpacity,
                    }}
                  >
                    <img
                      src={imgEl.src}
                      alt=""
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                  <SelectionOverlay
                    active={!!isImgSelected}
                    x={imgX}
                    y={imgY}
                    width={imgW}
                    height={imgH}
                    rotation={imgRotation}
                  />
                  {isImgSelected && isSelected && (
                    <TransformBox
                      x={imgX}
                      y={imgY}
                      width={imgW}
                      height={imgH}
                      rotation={imgRotation}
                      zoom={zoom}
                      isActive={true}
                      onTransform={(params) => {
                        if (!onContentUpdate) return;
                        const updatedImages = safeContent.images.map((img) =>
                          img.id === imgEl.id
                            ? {
                                ...img,
                                x: params.x !== undefined ? params.x : imgX,
                                y: params.y !== undefined ? params.y : imgY,
                                width: params.width !== undefined ? params.width : imgW,
                                height: params.height !== undefined ? params.height : imgH,
                                rotation:
                                  params.rotation !== undefined ? params.rotation : imgRotation,
                              }
                            : img,
                        );
                        onContentUpdate({ images: updatedImages });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* ─── Foreground Shapes (skip grouped & background) ─── */}
            {safeContent.shapes.map((shape, index) => {
              if (shape.isBackground) return null;
              if (groupedElementIds.has(shape.id)) return null;
              const isShapeSelected =
                selectedElement?.type === 'shape' && selectedElement.id === shape.id;
              const shapeX = shape.x || 0;
              const shapeY = shape.y || 0;
              const shapeWidth = shape.width || 100;
              const shapeHeight = shape.height || 100;
              const shapeRotation = shape.rotation || 0;

              const renderShape = () => {
                const shapeColor = hexToRgba(shape.color, shape.opacity);
                switch (shape.type) {
                  case 'rectangle':
                    return (
                      <div style={{ width: '100%', height: '100%', backgroundColor: shapeColor }} />
                    );
                  case 'circle':
                    return (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: shapeColor,
                          borderRadius: '50%',
                        }}
                      />
                    );
                  case 'triangle':
                    return (
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <polygon points="50,10 90,90 10,90" fill={shapeColor} />
                      </svg>
                    );
                  default:
                    return null;
                }
              };

              return (
                <div key={shape.id}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingElement)
                        handleElementClick({ type: 'shape', id: shape.id, index }, e);
                    }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape, index)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onElementSelect) onElementSelect({ type: 'shape', id: shape.id, index });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${shapeX}px`,
                      top: `${shapeY}px`,
                      width: `${shapeWidth}px`,
                      height: `${shapeHeight}px`,
                      transform: `rotate(${shapeRotation}deg)`,
                      transformOrigin: 'center center',
                      pointerEvents: 'auto',
                      cursor: isSelected ? 'move' : 'pointer',
                    }}
                  >
                    {renderShape()}
                  </div>
                  {/* Selection overlay */}
                  <SelectionOverlay
                    active={!!isShapeSelected}
                    x={shapeX}
                    y={shapeY}
                    width={shapeWidth}
                    height={shapeHeight}
                    rotation={shapeRotation}
                  />
                  {/* Multi-select overlay (ungrouped only) */}
                  {!isShapeSelected && isElementMultiSelected(shape.id) && (
                    <div
                      data-export-ignore
                      style={{
                        position: 'absolute',
                        left: `${shapeX}px`,
                        top: `${shapeY}px`,
                        width: `${shapeWidth}px`,
                        height: `${shapeHeight}px`,
                        boxShadow: '0 0 0 2px #14b8a6',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                        ...(shapeRotation
                          ? {
                              transform: `rotate(${shapeRotation}deg)`,
                              transformOrigin: 'center center',
                            }
                          : {}),
                      }}
                    />
                  )}
                  {/* Transform Box */}
                  {isShapeSelected && isSelected && (
                    <TransformBox
                      x={shapeX}
                      y={shapeY}
                      width={shapeWidth}
                      height={shapeHeight}
                      rotation={shapeRotation}
                      zoom={zoom}
                      isActive={true}
                      onTransform={(params) => {
                        if (!onContentUpdate) return;
                        const updatedShapes = safeContent.shapes.map((s) =>
                          s.id === shape.id
                            ? {
                                ...s,
                                x: params.x !== undefined ? params.x : shapeX,
                                y: params.y !== undefined ? params.y : shapeY,
                                width: params.width !== undefined ? params.width : shapeWidth,
                                height: params.height !== undefined ? params.height : shapeHeight,
                                rotation:
                                  params.rotation !== undefined ? params.rotation : shapeRotation,
                              }
                            : s,
                        );
                        onContentUpdate({ shapes: updatedShapes });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* ─── Foreground Images (skip grouped & background) ─── */}
            {safeContent.images.map((imgEl, index) => {
              if (imgEl.isBackground) return null;
              if (groupedElementIds.has(imgEl.id)) return null;
              const isImgSelected =
                selectedElement?.type === 'image' && selectedElement.id === imgEl.id;
              const imgX = imgEl.x || 0;
              const imgY = imgEl.y || 0;
              const imgW = imgEl.width || 200;
              const imgH = imgEl.height || 200;
              const imgRotation = imgEl.rotation || 0;
              const imgOpacity = (imgEl.opacity ?? 100) / 100;

              return (
                <div key={imgEl.id}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingElement)
                        handleElementClick({ type: 'image', id: imgEl.id, index }, e);
                    }}
                    onMouseDown={(e) => {
                      if (!isSelected) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingElement({
                        type: 'image',
                        id: imgEl.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        elemX: imgX,
                        elemY: imgY,
                      });
                      handleElementClick({ type: 'image', id: imgEl.id, index }, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onElementSelect) onElementSelect({ type: 'image', id: imgEl.id, index });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${imgX}px`,
                      top: `${imgY}px`,
                      width: `${imgW}px`,
                      height: `${imgH}px`,
                      transform: imgRotation ? `rotate(${imgRotation}deg)` : undefined,
                      transformOrigin: 'center center',
                      pointerEvents: 'auto',
                      cursor: isSelected ? 'move' : 'pointer',
                      opacity: imgOpacity,
                    }}
                  >
                    <img
                      src={imgEl.src}
                      alt=""
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                  {/* Selection overlay */}
                  <SelectionOverlay
                    active={!!isImgSelected}
                    x={imgX}
                    y={imgY}
                    width={imgW}
                    height={imgH}
                    rotation={imgRotation}
                  />
                  {/* Multi-select overlay */}
                  {!isImgSelected && isElementMultiSelected(imgEl.id) && (
                    <div
                      data-export-ignore
                      style={{
                        position: 'absolute',
                        left: `${imgX}px`,
                        top: `${imgY}px`,
                        width: `${imgW}px`,
                        height: `${imgH}px`,
                        boxShadow: '0 0 0 2px #14b8a6',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                        ...(imgRotation
                          ? {
                              transform: `rotate(${imgRotation}deg)`,
                              transformOrigin: 'center center',
                            }
                          : {}),
                      }}
                    />
                  )}
                  {/* Transform Box */}
                  {isImgSelected && isSelected && (
                    <TransformBox
                      x={imgX}
                      y={imgY}
                      width={imgW}
                      height={imgH}
                      rotation={imgRotation}
                      zoom={zoom}
                      isActive={true}
                      onTransform={(params) => {
                        if (!onContentUpdate) return;
                        const updatedImages = safeContent.images.map((img) =>
                          img.id === imgEl.id
                            ? {
                                ...img,
                                x: params.x !== undefined ? params.x : imgX,
                                y: params.y !== undefined ? params.y : imgY,
                                width: params.width !== undefined ? params.width : imgW,
                                height: params.height !== undefined ? params.height : imgH,
                                rotation:
                                  params.rotation !== undefined ? params.rotation : imgRotation,
                              }
                            : img,
                        );
                        onContentUpdate({ images: updatedImages });
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* ─── Logo (skip if grouped — renders inside group container) ─── */}
            {safeContent.logo &&
              !groupedElementIds.has('logo') &&
              (() => {
                const isLogoSelected = selectedElement?.type === 'logo';
                const logoDefaultPos = getLogoDefaultPosition();
                const logoX = logoDefaultPos.x;
                const logoY = logoDefaultPos.y;
                const logoWidth = safeContent.logoWidth || logoSize;
                const logoHeight = safeContent.logoHeight || logoSize;
                const logoRotation = safeContent.logoRotation || 0;
                const logoPadding = safeContent.logoBackgroundEnabled
                  ? Math.round(logoSize * 0.15)
                  : 0;

                return (
                  <div key="logo-container">
                    <div
                      ref={logoRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!draggingElement) handleElementClick({ type: 'logo' }, e);
                      }}
                      onMouseDown={handleLogoMouseDown}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onElementSelect) onElementSelect({ type: 'logo' });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${logoX}px`,
                        top: `${logoY}px`,
                        width: `${Math.round(logoWidth)}px`,
                        height: `${Math.round(logoHeight)}px`,
                        padding: `${logoPadding}px`,
                        backgroundColor: safeContent.logoBackgroundEnabled
                          ? hexToRgba(
                              safeContent.logoBackgroundColor,
                              safeContent.logoBackgroundOpacity,
                            )
                          : 'transparent',
                        borderRadius: safeContent.logoBackgroundEnabled
                          ? `${Math.round(logoSize * 0.1)}px`
                          : '0',
                        // Pure block layout — no flex, no table.
                        // Image centering via position + transform (html2canvas compatible).
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        ...(logoRotation
                          ? {
                              transform: `rotate(${logoRotation}deg)`,
                              transformOrigin: 'center center',
                            }
                          : {}),
                        pointerEvents: 'auto',
                        cursor: isSelected ? 'move' : 'pointer',
                      }}
                    >
                      {/* Centering wrapper — absolute positioned at 50%/50%
                        with translate(-50%,-50%). html2canvas reads the resolved
                        transform matrix from getComputedStyle so this works. */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          maxWidth: `${Math.round(logoWidth) - logoPadding * 2}px`,
                          maxHeight: `${Math.round(logoHeight) - logoPadding * 2}px`,
                          lineHeight: 0,
                        }}
                      >
                        <img
                          src={safeContent.logo}
                          alt="Logo"
                          crossOrigin="anonymous"
                          style={{
                            maxWidth: `${Math.round(logoWidth) - logoPadding * 2}px`,
                            maxHeight: `${Math.round(logoHeight) - logoPadding * 2}px`,
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                    {/* Selection overlay */}
                    <SelectionOverlay
                      active={!!isLogoSelected}
                      x={logoX}
                      y={logoY}
                      width={Math.round(logoWidth)}
                      height={Math.round(logoHeight)}
                      rotation={logoRotation}
                    />
                    {/* Multi-select overlay (ungrouped only) */}
                    {!isLogoSelected && isElementMultiSelected('logo') && (
                      <div
                        data-export-ignore
                        style={{
                          position: 'absolute',
                          left: `${logoX}px`,
                          top: `${logoY}px`,
                          width: `${Math.round(logoWidth)}px`,
                          height: `${Math.round(logoHeight)}px`,
                          boxShadow: '0 0 0 2px #14b8a6',
                          borderRadius: '2px',
                          pointerEvents: 'none',
                          ...(logoRotation
                            ? {
                                transform: `rotate(${logoRotation}deg)`,
                                transformOrigin: 'center center',
                              }
                            : {}),
                        }}
                      />
                    )}
                    {isLogoSelected && isSelected && (
                      <TransformBox
                        x={logoX}
                        y={logoY}
                        width={logoWidth}
                        height={logoHeight}
                        rotation={logoRotation}
                        zoom={zoom}
                        isActive={true}
                        onTransform={(params) => {
                          if (!onContentUpdate) return;
                          onContentUpdate({
                            logoX: params.x !== undefined ? params.x : logoX,
                            logoY: params.y !== undefined ? params.y : logoY,
                            logoWidth: params.width !== undefined ? params.width : logoWidth,
                            logoHeight: params.height !== undefined ? params.height : logoHeight,
                            logoRotation:
                              params.rotation !== undefined ? params.rotation : logoRotation,
                          });
                        }}
                      />
                    )}
                  </div>
                );
              })()}

            {/* ─── Text Elements (skip grouped — render inside group containers) ─── */}
            {safeContent.texts.map((textElement, index) => {
              if (groupedElementIds.has(textElement.id)) return null;
              const textFontSize = Math.round(baseFontSize * (textElement.fontSize / 100));
              const bgStyle = textElement.bgStyle || 'full-width';
              const isTextSelected =
                selectedElement?.type === 'text' && selectedElement.id === textElement.id;

              const fontWeight = textElement.fontWeight || 'normal';
              const fontStyle = textElement.fontStyle || 'normal';
              const textDecoration = textElement.textDecoration || 'none';
              const textTransform = textElement.textTransform || 'none';
              const textAlign = textElement.textAlign || 'center';
              const verticalAlign = textElement.verticalAlign || 'middle';
              const lineHeight = (textElement.lineHeight || 120) / 100;
              const letterSpacing = textElement.letterSpacing || 0;
              const paddingX = Math.round(textElement.paddingX || 16);
              const paddingY = Math.round(textElement.paddingY || 8);
              const listStyle = textElement.listStyle || 'none';
              const baseline = textElement.baseline || 'normal';

              const baselineStyle: React.CSSProperties = {};
              if (baseline === 'superscript') {
                baselineStyle.verticalAlign = 'super';
                baselineStyle.fontSize = '75%';
              } else if (baseline === 'subscript') {
                baselineStyle.verticalAlign = 'sub';
                baselineStyle.fontSize = '75%';
              }

              const { x, y } = getDefaultTextPosition(textElement, textFontSize, paddingY);
              const elementWidth =
                textElement.width || (bgStyle === 'inline' ? undefined : format.width);
              const elementHeight = textElement.height || undefined;
              const elementRotation = textElement.rotation || 0;
              const isFullWidth = !textElement.width && bgStyle !== 'inline';
              const hasExplicitHeight = !!elementHeight;

              // ─── Text frame style (pure BLOCK layout) ───────────────────
              // NO flex, NO table, NO table-cell.
              // html2canvas v1.4.1 does NOT reliably render flex, table-cell,
              // or vertical-align. Simple display:block + padding renders
              // identically in both the browser and the html2canvas export.
              const textFrameStyle: React.CSSProperties = {
                position: 'absolute',
                top: `${y}px`,
                // Text frames have NO background — just naked text on the canvas.
                // If you need a colored box behind text, use a Shape element.
                backgroundColor: 'transparent',
                boxSizing: 'border-box',
                cursor: isSelected ? 'move' : 'pointer',
                pointerEvents: 'auto',
                overflow: 'hidden',
                ...(elementRotation
                  ? {
                      transform: `rotate(${elementRotation}deg)`,
                      transformOrigin: 'center center',
                    }
                  : {}),
              };
              if (isFullWidth) {
                textFrameStyle.left = '0px';
                textFrameStyle.width = `${format.width}px`;
              } else {
                textFrameStyle.left = `${x}px`;
                textFrameStyle.width = elementWidth ? `${elementWidth}px` : 'auto';
              }

              // Height handling:
              // - auto (common): padding lives on the frame itself → simplest block layout
              // - explicit (rare, from TransformBox resize): content is absolutely
              //   positioned inside the frame for vertical alignment via
              //   top/bottom/transform — NO flex, NO table.
              if (hasExplicitHeight) {
                textFrameStyle.height = `${elementHeight}px`;
              } else {
                textFrameStyle.height = 'auto';
                textFrameStyle.paddingTop = `${paddingY}px`;
                textFrameStyle.paddingBottom = `${paddingY}px`;
                textFrameStyle.paddingLeft = `${paddingX}px`;
                textFrameStyle.paddingRight = `${paddingX}px`;
              }

              // For explicit height: absolute-positioned wrapper for v-align
              const resolvedWidth = isFullWidth ? format.width : elementWidth || 200;
              const contentWrapperStyle: React.CSSProperties | null = hasExplicitHeight
                ? {
                    position: 'absolute',
                    left: `${paddingX}px`,
                    width: `${resolvedWidth - paddingX * 2}px`,
                    boxSizing: 'border-box',
                    ...(verticalAlign === 'top'
                      ? {
                          top: `${paddingY}px`,
                        }
                      : verticalAlign === 'bottom'
                        ? {
                            bottom: `${paddingY}px`,
                          }
                        : {
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }),
                  }
                : null;

              const textStyles: React.CSSProperties = {
                color: textElement.color,
                fontSize: `${textFontSize}px`,
                fontFamily: textElement.fontFamily || 'inherit',
                fontWeight: fontWeightMap[fontWeight] ?? 400,
                fontStyle,
                textDecoration,
                textTransform: textTransform as any,
                textAlign: textAlign as any,
                lineHeight,
                letterSpacing: `${letterSpacing}px`,
                margin: 0,
                padding: 0,
                width: '100%',
                display: 'block',
                ...baselineStyle,
              };

              const renderTextContent = () => {
                if (listStyle === 'none') {
                  return (
                    <div
                      style={{
                        ...textStyles,
                        whiteSpace: bgStyle === 'inline' ? 'nowrap' : 'normal',
                      }}
                    >
                      {textElement.text}
                    </div>
                  );
                } else if (listStyle === 'bullet') {
                  return (
                    <ul
                      style={{
                        ...textStyles,
                        paddingLeft: `${textFontSize}px`,
                        listStyleType: 'disc',
                      }}
                    >
                      {textElement.text.split('\n').map((line, i) => (
                        <li
                          key={i}
                          style={{
                            color: textElement.color,
                            fontSize: `${textFontSize}px`,
                            lineHeight,
                            margin: 0,
                            padding: 0,
                          }}
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  );
                } else {
                  return (
                    <ol
                      style={{
                        ...textStyles,
                        paddingLeft: `${textFontSize}px`,
                        listStyleType: 'decimal',
                      }}
                    >
                      {textElement.text.split('\n').map((line, i) => (
                        <li
                          key={i}
                          style={{
                            color: textElement.color,
                            fontSize: `${textFontSize}px`,
                            lineHeight,
                            margin: 0,
                            padding: 0,
                          }}
                        >
                          {line}
                        </li>
                      ))}
                    </ol>
                  );
                }
              };

              return (
                <div key={textElement.id}>
                  <div
                    ref={(el) => {
                      textRefs.current.set(textElement.id, el);
                    }}
                    style={textFrameStyle}
                    onMouseDown={(e) => handleTextMouseDown(e, textElement, index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!draggingElement)
                        handleElementClick({ type: 'text', id: textElement.id, index }, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onElementSelect)
                        onElementSelect({ type: 'text', id: textElement.id, index });
                    }}
                  >
                    {contentWrapperStyle ? (
                      <div style={contentWrapperStyle}>{renderTextContent()}</div>
                    ) : (
                      renderTextContent()
                    )}
                  </div>
                  {/* Multi-select overlay (ungrouped only) */}
                  {!isTextSelected &&
                    isElementMultiSelected(textElement.id) &&
                    (() => {
                      const textRefElement = textRefs.current.get(textElement.id);
                      const actualWidth = isFullWidth
                        ? format.width
                        : elementWidth || textRefElement?.offsetWidth || 100;
                      const actualHeight = elementHeight || textRefElement?.offsetHeight || 30;
                      const transformX = isFullWidth ? 0 : x;
                      return (
                        <div
                          data-export-ignore
                          style={{
                            position: 'absolute',
                            left: `${transformX}px`,
                            top: `${y}px`,
                            width: `${actualWidth}px`,
                            height: `${actualHeight}px`,
                            boxShadow: '0 0 0 2px #14b8a6',
                            borderRadius: '2px',
                            pointerEvents: 'none',
                            ...(elementRotation
                              ? {
                                  transform: `rotate(${elementRotation}deg)`,
                                  transformOrigin: 'center center',
                                }
                              : {}),
                          }}
                        />
                      );
                    })()}
                  {/* TransformBox (includes selection overlay) */}
                  {isTextSelected &&
                    isSelected &&
                    (() => {
                      const textRefElement = textRefs.current.get(textElement.id);
                      const actualWidth = isFullWidth
                        ? format.width
                        : elementWidth || textRefElement?.offsetWidth || 100;
                      const actualHeight = elementHeight || textRefElement?.offsetHeight || 50;
                      const transformX = isFullWidth ? 0 : x;
                      return (
                        <TransformBox
                          x={transformX}
                          y={y}
                          width={actualWidth}
                          height={actualHeight}
                          rotation={elementRotation}
                          zoom={zoom}
                          isActive={true}
                          onTransform={(params) => {
                            if (!onContentUpdate) return;
                            const updatedTexts = safeContent.texts.map((t) =>
                              t.id === textElement.id
                                ? {
                                    ...t,
                                    x: isFullWidth ? 0 : params.x !== undefined ? params.x : x,
                                    y: params.y !== undefined ? params.y : y,
                                    width: isFullWidth
                                      ? undefined
                                      : params.width !== undefined
                                        ? params.width
                                        : elementWidth,
                                    height:
                                      params.height !== undefined ? params.height : elementHeight,
                                    rotation:
                                      params.rotation !== undefined
                                        ? params.rotation
                                        : elementRotation,
                                  }
                                : t,
                            );
                            onContentUpdate({ texts: updatedTexts });
                          }}
                        />
                      );
                    })()}
                </div>
              );
            })}

            {/* ─── CTAs ─── */}
            {safeContent.ctas.length > 0 &&
              (() => {
                const padding = Math.round(baseFontSize * 0.8);
                const ctaGap = Math.round(baseFontSize * 0.4);
                const isCtaGroupSelected = selectedElement?.type === 'cta-group';
                const hasCustomCtaPos =
                  safeContent.ctaGroupX !== undefined && safeContent.ctaGroupY !== undefined;

                // ── Pre-compute total CTA area height (for explicit pixel positioning) ──
                let totalCtaHeight = 0;
                safeContent.ctas.forEach((cta, index) => {
                  const fs = Math.round(
                    baseFontSize *
                      0.9 *
                      (safeContent.ctaSize / 100) *
                      ((cta.fontSize || 100) / 100),
                  );
                  const py = Math.round(fs * 0.5);
                  totalCtaHeight += Math.ceil(fs * 1.2) + py * 2;
                  if (index < safeContent.ctas.length - 1) totalCtaHeight += ctaGap;
                });

                // ── Compute default CTA group position from preset ──
                let defaultCtaX = 0;
                let defaultCtaY = 0;

                const pos = safeContent.ctaPosition || 'bottom';
                switch (pos) {
                  case 'top':
                    defaultCtaY = padding;
                    break;
                  case 'bottom':
                    defaultCtaY = format.height - padding - totalCtaHeight;
                    break;
                  case 'center':
                    defaultCtaY = Math.round((format.height - totalCtaHeight) / 2);
                    break;
                  case 'left':
                    defaultCtaY = Math.round((format.height - totalCtaHeight) / 2);
                    defaultCtaX = padding;
                    break;
                  case 'right':
                    defaultCtaY = Math.round((format.height - totalCtaHeight) / 2);
                    // For right preset, the X position will be determined after
                    // measuring. As a fallback, center it.
                    defaultCtaX = Math.round(format.width * 0.6);
                    break;
                  default:
                    defaultCtaY = format.height - padding - totalCtaHeight;
                    break;
                }

                // If the user has dragged the group, use custom position.
                // Otherwise use the preset-based default.
                const ctaGroupX = hasCustomCtaPos ? safeContent.ctaGroupX! : defaultCtaX;
                const ctaGroupY = hasCustomCtaPos ? safeContent.ctaGroupY! : defaultCtaY;

                // When custom position is set, the wrapper is content-sized at explicit x/y.
                // When preset position, the wrapper is full-width for text-align centering
                // (center/top/bottom) or left/right aligned.
                const ctaWrapperStyle: React.CSSProperties = {
                  position: 'absolute',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  textAlign: 'center',
                };
                const ctaColumnStyle: React.CSSProperties = {
                  display: 'inline-block',
                  pointerEvents: 'auto',
                  textAlign: 'center',
                  cursor: isSelected ? 'move' : 'pointer',
                };

                if (hasCustomCtaPos) {
                  // ── Free positioning mode ──────────────────────────────
                  ctaWrapperStyle.left = `${ctaGroupX}px`;
                  ctaWrapperStyle.top = `${ctaGroupY}px`;
                  ctaWrapperStyle.width = 'auto';
                } else {
                  // ── Preset positioning mode ────────────────────────────
                  ctaWrapperStyle.left = '0px';
                  ctaWrapperStyle.width = `${format.width}px`;
                  ctaWrapperStyle.top = `${ctaGroupY}px`;

                  if (pos === 'left') {
                    ctaWrapperStyle.textAlign = 'left';
                    ctaWrapperStyle.paddingLeft = `${padding}px`;
                    ctaColumnStyle.textAlign = 'left';
                  } else if (pos === 'right') {
                    ctaWrapperStyle.textAlign = 'right';
                    ctaWrapperStyle.paddingRight = `${padding}px`;
                    ctaColumnStyle.textAlign = 'right';
                  }
                }

                // ── Mouse down handler for CTA group drag ──
                const handleCtaGroupMouseDown = (e: React.MouseEvent) => {
                  if (!isSelected) return;
                  e.preventDefault();
                  e.stopPropagation();

                  let startElemX: number;
                  let startElemY: number;

                  if (hasCustomCtaPos) {
                    startElemX = safeContent.ctaGroupX!;
                    startElemY = safeContent.ctaGroupY!;
                  } else {
                    // Measure the column's actual position from the canvas
                    const colEl = ctaGroupRef.current;
                    const canvasEl = document.getElementById(id);
                    if (colEl && canvasEl) {
                      const colRect = colEl.getBoundingClientRect();
                      const canvasRect = canvasEl.getBoundingClientRect();
                      startElemX = Math.round((colRect.left - canvasRect.left) / zoom);
                      startElemY = Math.round((colRect.top - canvasRect.top) / zoom);
                    } else {
                      startElemX = ctaGroupX;
                      startElemY = ctaGroupY;
                    }
                  }

                  setDraggingElement({
                    type: 'cta-group',
                    id: 'cta-group',
                    startX: e.clientX,
                    startY: e.clientY,
                    elemX: startElemX,
                    elemY: startElemY,
                  });
                  handleElementClick({ type: 'cta-group' });
                };

                return (
                  <div key="cta-container">
                    <div style={ctaWrapperStyle}>
                      <div
                        ref={ctaGroupRef}
                        style={ctaColumnStyle}
                        onMouseDown={handleCtaGroupMouseDown}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!draggingElement) handleElementClick({ type: 'cta-group' });
                        }}
                      >
                        {safeContent.ctas.map((cta, index) => {
                          const isCtaSelected =
                            selectedElement?.type === 'cta' && selectedElement.id === cta.id;
                          const isLastCta = index === safeContent.ctas.length - 1;

                          const ctaFontSize = Math.round(
                            baseFontSize *
                              0.9 *
                              (safeContent.ctaSize / 100) *
                              ((cta.fontSize || 100) / 100),
                          );
                          const ctaBorderRadius = Math.round(
                            cta.borderRadius !== undefined
                              ? cta.borderRadius
                              : safeContent.ctaBorderRadius,
                          );
                          const ctaPaddingY = Math.round(ctaFontSize * 0.5);
                          const ctaPaddingX = Math.round(ctaFontSize * 1.5);

                          const bgColor = cta.bgColor || safeContent.ctaBgColor;
                          const textColor = cta.textColor || safeContent.ctaTextColor;
                          const borderWidth = Math.round(
                            cta.borderWidth !== undefined
                              ? cta.borderWidth
                              : safeContent.ctaBorderWidth,
                          );
                          const variant = cta.variant || safeContent.ctaButtonType;

                          let buttonBackground: string = bgColor;
                          const ctaGradient = cta.gradient || safeContent.ctaGradient;
                          if (ctaGradient.enabled) {
                            const dirMap: Record<string, string> = {
                              'to-r': 'to right',
                              'to-l': 'to left',
                              'to-t': 'to top',
                              'to-b': 'to bottom',
                              'to-br': 'to bottom right',
                              'to-bl': 'to bottom left',
                            };
                            buttonBackground = `linear-gradient(${dirMap[ctaGradient.direction] || 'to right'}, ${ctaGradient.from}, ${ctaGradient.to})`;
                          }

                          let boxShadow = 'none';
                          const ctaShadow = cta.shadow || safeContent.ctaShadow;
                          if (ctaShadow.enabled) {
                            boxShadow = `${ctaShadow.offsetX}px ${ctaShadow.offsetY}px ${ctaShadow.blur}px ${ctaShadow.color}`;
                          }

                          // Rectangle style (fills parent)
                          const rectStyle: React.CSSProperties = {
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                            width: '100%',
                            height: '100%',
                            borderRadius: `${ctaBorderRadius}px`,
                            boxShadow,
                            boxSizing: 'border-box',
                          };
                          if (variant === 'solid') {
                            rectStyle.background = buttonBackground;
                            rectStyle.border = 'none';
                          } else if (variant === 'outline') {
                            rectStyle.background = 'transparent';
                            rectStyle.border = `${borderWidth}px solid ${cta.borderColor || bgColor}`;
                          } else {
                            rectStyle.background = 'transparent';
                            rectStyle.border = 'none';
                          }

                          // Text overlay style (normal flow → determines parent size)
                          const textOverlayStyle: React.CSSProperties = {
                            position: 'relative',
                            padding: `${ctaPaddingY}px ${ctaPaddingX}px`,
                            fontSize: `${ctaFontSize}px`,
                            fontWeight: cta.fontWeight || 600,
                            fontFamily: cta.fontFamily || 'inherit',
                            color: variant === 'outline' ? cta.borderColor || bgColor : textColor,
                            textAlign: 'center',
                            lineHeight: 1.2,
                            letterSpacing: cta.letterSpacing ? `${cta.letterSpacing}px` : '0px',
                            textShadow: cta.textShadow || 'none',
                            margin: 0,
                            whiteSpace: 'nowrap',
                          };

                          return (
                            <div
                              key={cta.id}
                              style={{
                                marginBottom: isLastCta ? '0px' : `${ctaGap}px`,
                              }}
                            >
                              {/* CTA Group: rectangle + text */}
                              <div
                                ref={(el) => {
                                  ctaRefs.current.set(cta.id, el);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleElementClick({ type: 'cta', id: cta.id, index }, e);
                                }}
                                style={{
                                  position: 'relative',
                                  display: 'inline-block',
                                  cursor: 'pointer',
                                }}
                              >
                                {/* Layer 1: Rectangle background */}
                                <div style={rectStyle} />
                                {/* Layer 2: Text overlay (in normal flow → sizes the parent) */}
                                <div style={textOverlayStyle}>{cta.text}</div>
                              </div>
                              {/* Selection ring for individual CTA */}
                              {isCtaSelected && (
                                <div
                                  data-export-ignore
                                  style={{
                                    position: 'absolute',
                                    inset: '-4px',
                                    boxShadow: '0 0 0 2px #3b82f6',
                                    borderRadius: `${ctaBorderRadius + 4}px`,
                                    pointerEvents: 'none',
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* ── CTA Group TransformBox (outside canvas content) ── */}
                    {isCtaGroupSelected &&
                      isSelected &&
                      (() => {
                        const colEl = ctaGroupRef.current;
                        let groupX = ctaGroupX;
                        let groupY = ctaGroupY;
                        const groupW = colEl?.offsetWidth || 100;
                        const groupH = colEl?.offsetHeight || totalCtaHeight;

                        // If still in preset mode, measure column's position from DOM
                        if (!hasCustomCtaPos && colEl) {
                          const canvasEl = document.getElementById(id);
                          if (canvasEl) {
                            const colRect = colEl.getBoundingClientRect();
                            const canvasRect = canvasEl.getBoundingClientRect();
                            groupX = Math.round((colRect.left - canvasRect.left) / zoom);
                            groupY = Math.round((colRect.top - canvasRect.top) / zoom);
                          }
                        }

                        return (
                          <TransformBox
                            x={groupX}
                            y={groupY}
                            width={groupW}
                            height={groupH}
                            rotation={0}
                            zoom={zoom}
                            isActive={true}
                            onTransform={(params) => {
                              if (!onContentUpdate) return;
                              onContentUpdate({
                                ctaGroupX: params.x !== undefined ? params.x : groupX,
                                ctaGroupY: params.y !== undefined ? params.y : groupY,
                              });
                            }}
                          />
                        );
                      })()}
                  </div>
                );
              })()}
            {/* ═══ GROUP CONTAINERS — Real DOM containers ═══ */}
            {groups.map((group) => {
              const isThisGroupSelected =
                selectedElement?.type === 'group' && selectedElement.id === group.id;
              return (
                <div key={group.id}>
                  <div
                    data-group-id={group.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleElementClick({ type: 'group', id: group.id });
                    }}
                    onMouseDown={(e) => handleGroupMouseDown(e, group)}
                    style={{
                      position: 'absolute',
                      left: `${group.x}px`,
                      top: `${group.y}px`,
                      width: `${group.width}px`,
                      height: `${group.height}px`,
                      display: 'block',
                      overflow: 'visible',
                      pointerEvents: 'auto',
                      cursor: isSelected ? 'move' : 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    {group.memberIds.map((memberId) => {
                      const shape = safeContent.shapes.find((s) => s.id === memberId);
                      if (shape) {
                        const sx = shape.x || 0,
                          sy = shape.y || 0;
                        const sw = shape.width || 100,
                          sh = shape.height || 100;
                        const sr = shape.rotation || 0;
                        const sc = hexToRgba(shape.color, shape.opacity);
                        return (
                          <div
                            key={shape.id}
                            style={{
                              position: 'absolute',
                              left: `${sx}px`,
                              top: `${sy}px`,
                              width: `${sw}px`,
                              height: `${sh}px`,
                              transform: sr ? `rotate(${sr}deg)` : undefined,
                              transformOrigin: 'center center',
                            }}
                          >
                            {shape.type === 'rectangle' && (
                              <div style={{ width: '100%', height: '100%', backgroundColor: sc }} />
                            )}
                            {shape.type === 'circle' && (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  backgroundColor: sc,
                                  borderRadius: '50%',
                                }}
                              />
                            )}
                            {shape.type === 'triangle' && (
                              <svg
                                width="100%"
                                height="100%"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                              >
                                <polygon points="50,10 90,90 10,90" fill={sc} />
                              </svg>
                            )}
                          </div>
                        );
                      }
                      const txt = safeContent.texts.find((t) => t.id === memberId);
                      if (txt) {
                        const tfs = Math.round(baseFontSize * (txt.fontSize / 100));
                        const bg = txt.bgStyle || 'full-width';
                        const fw = txt.fontWeight || 'normal';
                        const fs2 = txt.fontStyle || 'normal';
                        const td = txt.textDecoration || 'none';
                        const tt = txt.textTransform || 'none';
                        const ta = txt.textAlign || 'center';
                        const va = txt.verticalAlign || 'middle';
                        const lh = (txt.lineHeight || 120) / 100;
                        const ls = txt.letterSpacing || 0;
                        const px = Math.round(txt.paddingX || 16);
                        const py = Math.round(txt.paddingY || 8);
                        const er = txt.rotation || 0;
                        const ls2 = txt.listStyle || 'none';
                        const bl = txt.baseline || 'normal';
                        const txx = txt.x || 0;
                        const tyy = txt.y || 0;
                        const ew = txt.width || group.width;
                        const eh = txt.height || undefined;
                        const hasExplH = !!eh;

                        const baselineExtra: React.CSSProperties = {};
                        if (bl === 'superscript') {
                          baselineExtra.verticalAlign = 'super';
                          baselineExtra.fontSize = '75%';
                        } else if (bl === 'subscript') {
                          baselineExtra.verticalAlign = 'sub';
                          baselineExtra.fontSize = '75%';
                        }

                        const tFrameStyle: React.CSSProperties = {
                          position: 'absolute',
                          left: `${txx}px`,
                          top: `${tyy}px`,
                          width: `${ew}px`,
                          backgroundColor: 'transparent',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          ...(er
                            ? { transform: `rotate(${er}deg)`, transformOrigin: 'center center' }
                            : {}),
                        };
                        if (hasExplH) {
                          tFrameStyle.height = `${eh}px`;
                        } else {
                          tFrameStyle.height = 'auto';
                          tFrameStyle.paddingTop = `${py}px`;
                          tFrameStyle.paddingBottom = `${py}px`;
                          tFrameStyle.paddingLeft = `${px}px`;
                          tFrameStyle.paddingRight = `${px}px`;
                        }

                        // For explicit height: v-align wrapper
                        const vAlignWrapper: React.CSSProperties | null = hasExplH
                          ? {
                              position: 'absolute',
                              left: `${px}px`,
                              width: `${ew - px * 2}px`,
                              boxSizing: 'border-box',
                              ...(va === 'top'
                                ? { top: `${py}px` }
                                : va === 'bottom'
                                  ? { bottom: `${py}px` }
                                  : { top: '50%', transform: 'translateY(-50%)' }),
                            }
                          : null;

                        const tStyle: React.CSSProperties = {
                          color: txt.color,
                          fontSize: `${tfs}px`,
                          fontFamily: txt.fontFamily || 'inherit',
                          fontWeight: fontWeightMap[fw] ?? 400,
                          fontStyle: fs2,
                          textDecoration: td,
                          textTransform: tt as any,
                          textAlign: ta as any,
                          lineHeight: lh,
                          letterSpacing: `${ls}px`,
                          margin: 0,
                          padding: 0,
                          width: '100%',
                          display: 'block',
                          ...baselineExtra,
                        };

                        const renderGroupText = () => {
                          if (ls2 === 'bullet') {
                            return (
                              <ul
                                style={{
                                  ...tStyle,
                                  paddingLeft: `${tfs}px`,
                                  listStyleType: 'disc',
                                }}
                              >
                                {txt.text.split('\n').map((line: string, li: number) => (
                                  <li
                                    key={li}
                                    style={{
                                      color: txt.color,
                                      fontSize: `${tfs}px`,
                                      lineHeight: lh,
                                      margin: 0,
                                      padding: 0,
                                    }}
                                  >
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            );
                          } else if (ls2 === 'numbered') {
                            return (
                              <ol
                                style={{
                                  ...tStyle,
                                  paddingLeft: `${tfs}px`,
                                  listStyleType: 'decimal',
                                }}
                              >
                                {txt.text.split('\n').map((line: string, li: number) => (
                                  <li
                                    key={li}
                                    style={{
                                      color: txt.color,
                                      fontSize: `${tfs}px`,
                                      lineHeight: lh,
                                      margin: 0,
                                      padding: 0,
                                    }}
                                  >
                                    {line}
                                  </li>
                                ))}
                              </ol>
                            );
                          }
                          return (
                            <div
                              style={{
                                ...tStyle,
                                whiteSpace: bg === 'inline' ? 'nowrap' : 'normal',
                              }}
                            >
                              {txt.text}
                            </div>
                          );
                        };

                        return (
                          <div key={txt.id} style={tFrameStyle}>
                            {vAlignWrapper ? (
                              <div style={vAlignWrapper}>{renderGroupText()}</div>
                            ) : (
                              renderGroupText()
                            )}
                          </div>
                        );
                      }
                      // ── Image inside group ──
                      const groupImg = safeContent.images.find((i) => i.id === memberId);
                      if (groupImg) {
                        const gix = groupImg.x || 0,
                          giy = groupImg.y || 0;
                        const giw = groupImg.width || 200,
                          gih = groupImg.height || 200;
                        const gir = groupImg.rotation || 0;
                        const giOp = (groupImg.opacity ?? 100) / 100;
                        return (
                          <div
                            key={groupImg.id}
                            style={{
                              position: 'absolute',
                              left: `${gix}px`,
                              top: `${giy}px`,
                              width: `${giw}px`,
                              height: `${gih}px`,
                              opacity: giOp,
                              transform: gir ? `rotate(${gir}deg)` : undefined,
                              transformOrigin: 'center center',
                            }}
                          >
                            <img
                              src={groupImg.src}
                              alt=""
                              draggable={false}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </div>
                        );
                      }
                      if (memberId === 'logo' && safeContent.logo) {
                        const lx = safeContent.logoX || 0;
                        const ly = safeContent.logoY || 0;
                        const lw = safeContent.logoWidth || logoSize;
                        const lhh = safeContent.logoHeight || logoSize;
                        const lr = safeContent.logoRotation || 0;
                        const lPad = safeContent.logoBackgroundEnabled
                          ? Math.round(logoSize * 0.15)
                          : 0;
                        return (
                          <div
                            key="logo-in-group"
                            style={{
                              position: 'absolute',
                              left: `${lx}px`,
                              top: `${ly}px`,
                              width: `${Math.round(lw)}px`,
                              height: `${Math.round(lhh)}px`,
                              padding: `${lPad}px`,
                              backgroundColor: safeContent.logoBackgroundEnabled
                                ? hexToRgba(
                                    safeContent.logoBackgroundColor,
                                    safeContent.logoBackgroundOpacity,
                                  )
                                : 'transparent',
                              borderRadius: safeContent.logoBackgroundEnabled
                                ? `${Math.round(logoSize * 0.1)}px`
                                : '0',
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              ...(lr
                                ? {
                                    transform: `rotate(${lr}deg)`,
                                    transformOrigin: 'center center',
                                  }
                                : {}),
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                maxWidth: `${Math.round(lw) - lPad * 2}px`,
                                maxHeight: `${Math.round(lhh) - lPad * 2}px`,
                                lineHeight: 0,
                              }}
                            >
                              <img
                                src={safeContent.logo}
                                alt="Logo"
                                crossOrigin="anonymous"
                                style={{
                                  maxWidth: `${Math.round(lw) - lPad * 2}px`,
                                  maxHeight: `${Math.round(lhh) - lPad * 2}px`,
                                  width: 'auto',
                                  height: 'auto',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {isThisGroupSelected && (
                    <div
                      data-export-ignore
                      style={{
                        position: 'absolute',
                        left: `${group.x - 2}px`,
                        top: `${group.y - 2}px`,
                        width: `${group.width + 4}px`,
                        height: `${group.height + 4}px`,
                        border: '2px dashed #14b8a6',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {isThisGroupSelected && isSelected && (
                    <TransformBox
                      x={group.x}
                      y={group.y}
                      width={group.width}
                      height={group.height}
                      rotation={0}
                      zoom={zoom}
                      isActive={true}
                      onTransform={(params) => {
                        if (!onContentUpdate) return;
                        const updatedGroups = groups.map((g) =>
                          g.id === group.id
                            ? {
                                ...g,
                                x: params.x !== undefined ? params.x : group.x,
                                y: params.y !== undefined ? params.y : group.y,
                                width: params.width !== undefined ? params.width : group.width,
                                height: params.height !== undefined ? params.height : group.height,
                              }
                            : g,
                        );
                        onContentUpdate({ groups: updatedGroups });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* ═══ END CANVAS ═══ */}
        </div>

        {/* Overlay controls (outside canvas — never exported) */}
        <FixedScale zoom={zoom} className="absolute top-2 right-2">
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ pointerEvents: isMaster ? 'none' : 'auto' }}
          >
            {isSuperMaster && (
              <Badge variant="default" className="text-xs gap-1 pointer-events-none">
                <Crown className="h-3 w-3" />
                Master
              </Badge>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            {onDelete && !isMaster && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-7 p-0 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </FixedScale>

        {/* Format info — pointer-events-none so the label never blocks clicks
            on neighbouring banners at low zoom (FixedScale grows in world space) */}
        <FixedScale zoom={zoom} className="mt-2 text-center pointer-events-none">
          <p className="text-xs font-medium text-gray-700">{format.name}</p>
          <p className="text-xs text-gray-500">
            {format.width} × {format.height}
          </p>
        </FixedScale>
      </div>
    );
  },
);

BannerCanvas.displayName = 'BannerCanvas';
