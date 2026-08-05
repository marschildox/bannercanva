import React, {
  useState,
  useRef,
  useCallback,
  ReactNode,
  WheelEvent,
  MouseEvent,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { Move, Home } from 'lucide-react';
import { Button } from './ui/button';

interface InfinityBoardProps {
  children: ReactNode;
  zoom?: number;
  onClick?: (e: React.MouseEvent) => void;
}

export interface InfinityBoardRef {
  panTo: (x: number, y: number) => void;
  centerOn: (element: HTMLElement) => void;
  reset: () => void;
}

export const InfinityBoard = forwardRef<InfinityBoardRef, InfinityBoardProps>(
  ({ children, zoom = 1, onClick }, ref) => {
    const [pan, setPan] = useState({ x: 0, y: 0 }); // Will be initialized to center
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize pan to center of viewport
    useEffect(() => {
      if (containerRef.current && !isInitialized) {
        const rect = containerRef.current.getBoundingClientRect();
        setPan({
          x: rect.width / 2,
          y: rect.height / 2,
        });
        setIsInitialized(true);
      }
    }, [isInitialized]);

    const resetView = useCallback(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPan({
          x: rect.width / 2,
          y: rect.height / 2,
        });
      }
    }, []);

    const panTo = useCallback((x: number, y: number) => {
      setPan({ x, y });
    }, []);

    const centerOn = useCallback((element: HTMLElement) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate the center of the container
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;

      // Calculate the center of the element in screen coordinates
      const elementCenterX = elementRect.left + elementRect.width / 2;
      const elementCenterY = elementRect.top + elementRect.height / 2;

      // Calculate the offset needed to center the element
      const offsetX = containerCenterX - elementCenterX;
      const offsetY = containerCenterY - elementCenterY;

      // Apply the offset to current pan
      setPan((prev) => ({
        x: prev.x + offsetX,
        y: prev.y + offsetY,
      }));
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      panTo,
      centerOn,
      reset: resetView,
    }));

    const handleMouseDown = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        // Only start panning if clicking on the background (not on a banner or button)
        const target = e.target as HTMLElement;
        const isBackground =
          target === e.currentTarget ||
          target.classList.contains('infinity-grid') ||
          target.classList.contains('infinity-content');

        if (isBackground) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          e.preventDefault();
        }
      },
      [pan],
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isDragging) {
          setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          });
        }
      },
      [isDragging, dragStart],
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
      // Pan with scroll wheel (holding shift for horizontal, default for vertical)
      if (e.shiftKey) {
        setPan((prev) => ({ ...prev, x: prev.x - e.deltaY }));
      } else {
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    }, []);

    // Grid pattern for infinite board feel - Professional grid with lines
    const gridSize = 20;
    const largeGridSize = 100;

    const gridPattern = `
      <svg width="${largeGridSize}" height="${largeGridSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="smallGrid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
            <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#e5e7eb" stroke-width="0.5" opacity="0.5"/>
          </pattern>
          <pattern id="grid" width="${largeGridSize}" height="${largeGridSize}" patternUnits="userSpaceOnUse">
            <rect width="${largeGridSize}" height="${largeGridSize}" fill="url(#smallGrid)"/>
            <path d="M ${largeGridSize} 0 L 0 0 0 ${largeGridSize}" fill="none" stroke="#d1d5db" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
    `;

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-gray-100 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          flex: 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={onClick}
      >
        {/* Infinite Grid Background */}
        <div
          className="infinity-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(gridPattern)}")`,
            backgroundPosition: `${pan.x % largeGridSize}px ${pan.y % largeGridSize}px`,
            backgroundSize: `${largeGridSize}px ${largeGridSize}px`,
          }}
        />

        {/* Content with Pan & Zoom */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Center point indicator */}
          <div className="absolute top-0 left-0 pointer-events-none">
            <div className="w-2 h-2 bg-blue-500 rounded-full -translate-x-1 -translate-y-1" />
          </div>

          {/* Content */}
          <div className="p-16">{children}</div>
        </div>
      </div>
    );
  },
);

InfinityBoard.displayName = 'InfinityBoard';
