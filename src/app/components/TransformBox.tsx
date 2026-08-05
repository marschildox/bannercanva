import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, RotateCcw, Rotate3D } from 'lucide-react';

interface TransformBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  onTransform: (params: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }) => void;
  onReset?: () => void;
  zoom: number;
  isActive?: boolean;
}

type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'move';

export function TransformBox({
  x,
  y,
  width,
  height,
  rotation,
  onTransform,
  onReset,
  zoom,
  isActive = true,
}: TransformBoxProps) {
  const [dragging, setDragging] = useState<{
    type: HandleType;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    elementX: number;
    elementY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [showRotateModal, setShowRotateModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rotateButtonRef = useRef<HTMLDivElement>(null);

  // Calculate center point
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const handleMouseDown = (e: React.MouseEvent, type: HandleType) => {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    setDragging({
      type,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: width,
      startHeight: height,
      elementX: x,
      elementY: y,
      centerX,
      centerY,
    });
  };

  // Toggle rotate modal
  const toggleRotateModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showRotateModal && rotateButtonRef.current) {
      const rect = rotateButtonRef.current.getBoundingClientRect();
      setModalPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }

    setShowRotateModal(!showRotateModal);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragging.startX) / zoom;
      const deltaY = (e.clientY - dragging.startY) / zoom;

      if (dragging.type === 'move') {
        onTransform({
          x: Math.round(dragging.elementX + deltaX),
          y: Math.round(dragging.elementY + deltaY),
        });
      } else {
        // Resize handles - with center origin compensation
        let newWidth = dragging.startWidth;
        let newHeight = dragging.startHeight;

        const rad = (rotation * Math.PI) / 180;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const rotatedDeltaX = deltaX * cos - deltaY * sin;
        const rotatedDeltaY = deltaX * sin + deltaY * cos;

        let widthChange = 0;
        let heightChange = 0;

        switch (dragging.type) {
          case 'se':
            widthChange = rotatedDeltaX;
            heightChange = rotatedDeltaY;
            newWidth = Math.max(20, dragging.startWidth + widthChange);
            newHeight = Math.max(20, dragging.startHeight + heightChange);
            break;
          case 'sw':
            widthChange = -rotatedDeltaX;
            heightChange = rotatedDeltaY;
            newWidth = Math.max(20, dragging.startWidth + widthChange);
            newHeight = Math.max(20, dragging.startHeight + heightChange);
            break;
          case 'ne':
            widthChange = rotatedDeltaX;
            heightChange = -rotatedDeltaY;
            newWidth = Math.max(20, dragging.startWidth + widthChange);
            newHeight = Math.max(20, dragging.startHeight + heightChange);
            break;
          case 'nw':
            widthChange = -rotatedDeltaX;
            heightChange = -rotatedDeltaY;
            newWidth = Math.max(20, dragging.startWidth + widthChange);
            newHeight = Math.max(20, dragging.startHeight + heightChange);
            break;
        }

        const actualWidthChange = newWidth - dragging.startWidth;
        const actualHeightChange = newHeight - dragging.startHeight;

        const centerOffsetX = actualWidthChange / 2;
        const centerOffsetY = actualHeightChange / 2;

        const rotatedOffsetX = centerOffsetX * cos - centerOffsetY * sin;
        const rotatedOffsetY = centerOffsetX * sin + centerOffsetY * cos;

        let newX = dragging.elementX;
        let newY = dragging.elementY;

        switch (dragging.type) {
          case 'se':
            newX = dragging.elementX + rotatedOffsetX;
            newY = dragging.elementY + rotatedOffsetY;
            break;
          case 'sw':
            newX = dragging.elementX - rotatedOffsetX;
            newY = dragging.elementY + rotatedOffsetY;
            break;
          case 'ne':
            newX = dragging.elementX + rotatedOffsetX;
            newY = dragging.elementY - rotatedOffsetY;
            break;
          case 'nw':
            newX = dragging.elementX - rotatedOffsetX;
            newY = dragging.elementY - rotatedOffsetY;
            break;
        }

        onTransform({
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, zoom, rotation, onTransform]);

  // Close modal when clicking outside
  useEffect(() => {
    if (!showRotateModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.rotate-modal') && !target.closest('.rotate-button')) {
        setShowRotateModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRotateModal]);

  if (!isActive) return null;

  const handleSize = 8;

  // Rotation helpers - now 15° increments
  const rotateLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransform({ rotation: rotation - 15 });
  };

  const rotateRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransform({ rotation: rotation + 15 });
  };

  const resetRotation = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTransform({ rotation: 0 });
  };

  return (
    <>
      {/* Transform Box */}
      <div
        ref={containerRef}
        data-export-ignore
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        {/* Border */}
        <div
          className="absolute inset-0 border-2 border-blue-500"
          style={{ pointerEvents: 'auto', cursor: 'move' }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        />

        {/* Corner Handles */}
        <div
          className="absolute bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize"
          style={{
            left: `-${handleSize / 2}px`,
            top: `-${handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
        />

        <div
          className="absolute bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize"
          style={{
            right: `-${handleSize / 2}px`,
            top: `-${handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
        />

        <div
          className="absolute bg-white border-2 border-blue-500 rounded-sm cursor-nesw-resize"
          style={{
            left: `-${handleSize / 2}px`,
            bottom: `-${handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
        />

        <div
          className="absolute bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize"
          style={{
            right: `-${handleSize / 2}px`,
            bottom: `-${handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'se')}
        />

        {/* Rotate Button */}
        <div
          ref={rotateButtonRef}
          className="absolute left-1/2 -translate-x-1/2 cursor-pointer rotate-button"
          style={{
            top: '-35px',
            pointerEvents: 'auto',
          }}
          onClick={toggleRotateModal}
        >
          <div className="w-7 h-7 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center shadow-md hover:bg-blue-50 transition-colors">
            <Rotate3D className="w-4 h-4 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Rotation Modal - Rendered via Portal to prevent cropping */}
      {showRotateModal &&
        createPortal(
          <div
            className="rotate-modal flex items-center gap-1 bg-white border-2 border-blue-500 rounded-md px-2 py-1.5 shadow-lg"
            style={{
              position: 'fixed',
              left: `${modalPosition.x}px`,
              top: `${modalPosition.y}px`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'auto',
              zIndex: 10000,
            }}
          >
            {/* Rotate Left 15° */}
            <button
              onClick={rotateLeft}
              className="p-1.5 hover:bg-blue-50 rounded transition-colors"
              title="Rotate -15°"
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
            </button>

            {/* Current Rotation Display */}
            <div className="px-2 text-sm font-medium text-blue-600 min-w-[45px] text-center">
              {rotation}°
            </div>

            {/* Rotate Right 15° */}
            <button
              onClick={rotateRight}
              className="p-1.5 hover:bg-blue-50 rounded transition-colors"
              title="Rotate +15°"
            >
              <RotateCw className="w-4 h-4 text-blue-600" />
            </button>

            {/* Reset Rotation */}
            {rotation !== 0 && (
              <button
                onClick={resetRotation}
                className="ml-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                title="Reset rotation to 0°"
              >
                Reset
              </button>
            )}

            {/* Full Reset (if onReset is provided) */}
            {onReset && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                  setShowRotateModal(false);
                }}
                className="ml-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                title="Reset all transformations"
              >
                Reset All
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
