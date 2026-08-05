import React, {
  useState,
  useRef,
  useCallback,
  ReactNode,
  MouseEvent,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';

interface InfinityBoardProps {
  children: ReactNode;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export interface ViewportInsets {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface InfinityBoardRef {
  panTo: (x: number, y: number) => void;
  centerOn: (element: HTMLElement) => void;
  reset: () => void;
  zoomToFit: (insets?: ViewportInsets) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Infinite pannable/zoomable canvas with Miro/FigJam-style navigation:
 *
 * - Two-finger scroll / mouse wheel  → pan
 * - Pinch (ctrl+wheel) or cmd+wheel  → zoom towards the cursor
 * - Drag empty canvas               → pan
 * - Space + drag (anywhere)         → pan
 * - Middle mouse button drag        → pan
 * - Zoom-to-fit via imperative ref  → frames all content
 */
export const InfinityBoard = forwardRef<InfinityBoardRef, InfinityBoardProps>(
  ({ children, zoom = 1, minZoom = 0.1, maxZoom = 4, onZoomChange, onClick }, ref) => {
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [spacePressed, setSpacePressed] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const didPanRef = useRef(false);

    // Refs mirrored for native (non-React) event handlers
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);
    const onZoomChangeRef = useRef(onZoomChange);
    zoomRef.current = zoom;
    panRef.current = pan;
    onZoomChangeRef.current = onZoomChange;
    const minZoomRef = useRef(minZoom);
    const maxZoomRef = useRef(maxZoom);
    minZoomRef.current = minZoom;
    maxZoomRef.current = maxZoom;

    // Initialize pan to center of viewport
    useEffect(() => {
      if (containerRef.current && !isInitialized) {
        const rect = containerRef.current.getBoundingClientRect();
        setPan({ x: rect.width / 2, y: rect.height / 2 });
        setIsInitialized(true);
      }
    }, [isInitialized]);

    const resetView = useCallback(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPan({ x: rect.width / 2, y: rect.height / 2 });
      }
    }, []);

    const panTo = useCallback((x: number, y: number) => {
      setPan({ x, y });
    }, []);

    const centerOn = useCallback((element: HTMLElement) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const offsetX =
        containerRect.left + containerRect.width / 2 - (elementRect.left + elementRect.width / 2);
      const offsetY =
        containerRect.top + containerRect.height / 2 - (elementRect.top + elementRect.height / 2);

      setPan((prev) => ({ x: prev.x + offsetX, y: prev.y + offsetY }));
    }, []);

    const fitOnce = useCallback((insets: ViewportInsets = {}) => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      const cRect = container.getBoundingClientRect();
      const rect = content.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Usable viewport excluding floating side panels
      const insetLeft = insets.left ?? 0;
      const insetRight = insets.right ?? 0;
      const insetTop = insets.top ?? 0;
      const insetBottom = insets.bottom ?? 0;
      const viewW = cRect.width - insetLeft - insetRight;
      const viewH = cRect.height - insetTop - insetBottom;

      const currentZoom = zoomRef.current;
      const worldW = rect.width / currentZoom;
      const worldH = rect.height / currentZoom;
      const margin = 64;

      const newZoom = clamp(
        Math.min((viewW - margin) / worldW, (viewH - margin) / worldH),
        minZoomRef.current,
        maxZoomRef.current,
      );

      // World-space origin of the content box
      const worldX = (rect.left - cRect.left - panRef.current.x) / currentZoom;
      const worldY = (rect.top - cRect.top - panRef.current.y) / currentZoom;

      const newPan = {
        x: insetLeft + (viewW - worldW * newZoom) / 2 - worldX * newZoom,
        y: insetTop + (viewH - worldH * newZoom) / 2 - worldY * newZoom,
      };
      panRef.current = newPan;
      zoomRef.current = newZoom;
      setPan(newPan);
      onZoomChangeRef.current?.(newZoom);
    }, []);

    const zoomToFit = useCallback(
      (insets: ViewportInsets = {}) => {
        // Two passes: fixed-scale UI elements (headers, buttons) resize in
        // world space after a zoom change, shifting the content bounds — the
        // second pass runs after that re-layout and converges the fit.
        fitOnce(insets);
        requestAnimationFrame(() => requestAnimationFrame(() => fitOnce(insets)));
      },
      [fitOnce],
    );

    useImperativeHandle(ref, () => ({
      panTo,
      centerOn,
      reset: resetView,
      zoomToFit,
    }));

    // Space key → temporary pan mode (like Figma/Miro)
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !isTypingTarget(e.target)) {
          e.preventDefault();
          setSpacePressed(true);
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setSpacePressed(false);
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }, []);

    // Native wheel listener (React's onWheel is passive — preventDefault
    // wouldn't stop browser page-zoom on pinch/ctrl+wheel)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const onWheel = (e: globalThis.WheelEvent) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
          // Pinch gesture or ctrl/cmd + wheel → zoom towards cursor
          const rect = container.getBoundingClientRect();
          const px = e.clientX - rect.left;
          const py = e.clientY - rect.top;

          const oldZoom = zoomRef.current;
          const factor = Math.exp(-e.deltaY * 0.01);
          const newZoom = clamp(oldZoom * factor, minZoomRef.current, maxZoomRef.current);
          if (newZoom === oldZoom) return;

          setPan((prev) => ({
            x: px - ((px - prev.x) * newZoom) / oldZoom,
            y: py - ((py - prev.y) * newZoom) / oldZoom,
          }));
          // Eagerly update the ref so rapid pinch events compound correctly
          zoomRef.current = newZoom;
          onZoomChangeRef.current?.(newZoom);
        } else if (e.shiftKey) {
          // Shift + wheel → horizontal pan
          setPan((prev) => ({ ...prev, x: prev.x - (e.deltaY || e.deltaX) }));
        } else {
          // Two-finger scroll / wheel → pan
          setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
      };

      container.addEventListener('wheel', onWheel, { passive: false });
      return () => container.removeEventListener('wheel', onWheel);
    }, []);

    const handleMouseDown = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const isBackground =
          target === e.currentTarget ||
          target.classList.contains('infinity-grid') ||
          target.classList.contains('infinity-content');

        // Pan from anywhere with space or middle button; from background with left button
        if (spacePressed || e.button === 1 || (isBackground && e.button === 0)) {
          setIsDragging(true);
          didPanRef.current = false;
          dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          e.preventDefault();
        }
      },
      [pan, spacePressed],
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (isDragging) {
          didPanRef.current = true;
          setPan({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y,
          });
        }
      },
      [isDragging],
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        // Suppress click-to-deselect after an actual pan gesture
        if (didPanRef.current) {
          didPanRef.current = false;
          return;
        }
        onClick?.(e);
      },
      [onClick],
    );

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
        style={{
          cursor: isDragging ? 'grabbing' : spacePressed ? 'grab' : 'default',
          flex: 1,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={handleClick}
      >
        {/* Infinite Grid Background */}
        <div
          className="infinity-grid absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(gridPattern)}")`,
            backgroundPosition: `${pan.x % largeGridSize}px ${pan.y % largeGridSize}px`,
            backgroundSize: `${largeGridSize * zoom}px ${largeGridSize * zoom}px`,
          }}
        />

        {/* Content with Pan & Zoom */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Content */}
          <div ref={contentRef} className="infinity-content p-16 w-max">
            {children}
          </div>
        </div>
      </div>
    );
  },
);

InfinityBoard.displayName = 'InfinityBoard';
