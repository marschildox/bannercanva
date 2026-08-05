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

    /**
     * Frame the whole board inside the usable viewport.
     *
     * The board's on-screen size is not proportional to the zoom, so a single
     * division can't solve it. Measured behaviour: a banner's screen size grows
     * with the *square* of the zoom (the board scales the banner, and the
     * banner scales its own canvas), the world-space gaps between banners grow
     * linearly, and the counter-scaled chrome (column headers, banner labels,
     * add-format buttons) stays a constant number of pixels.
     *
     * So this converges instead of guessing: each pass measures the real box
     * and steps the zoom by sqrt(needed / measured) — the inverse of the
     * dominant quadratic term, which lands within a few percent on the first
     * pass — then stops as soon as the board fits, and finishes with a pure
     * pan to centre it. Bounded so no layout can make it spin.
     */
    const zoomToFit = useCallback((insets: ViewportInsets = {}) => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      const MARGIN = 24;
      const MAX_PASSES = 9; // bisection over [minZoom, maxZoom] — ~0.008 resolution
      let passes = 0;

      const usableArea = () => {
        const c = container.getBoundingClientRect();
        const left = c.left + (insets.left ?? 0) + MARGIN;
        const top = c.top + (insets.top ?? 0) + MARGIN;
        return {
          left,
          top,
          width: Math.max(80, c.width - (insets.left ?? 0) - (insets.right ?? 0) - MARGIN * 2),
          height: Math.max(80, c.height - (insets.top ?? 0) - (insets.bottom ?? 0) - MARGIN * 2),
        };
      };

      const centreContent = () => {
        const area = usableArea();
        const rect = content.getBoundingClientRect();
        const next = {
          x: panRef.current.x + (area.left + area.width / 2 - (rect.left + rect.width / 2)),
          y: panRef.current.y + (area.top + area.height / 2 - (rect.top + rect.height / 2)),
        };
        panRef.current = next;
        setPan(next);
      };

      // Bisect on the zoom. "Does the board fit?" is monotonic in zoom, which
      // is all bisection needs — no model of the growth curve — and the last
      // zoom known to fit is what gets applied, so it never ends overflowing.
      let low = minZoomRef.current;
      let high = maxZoomRef.current;
      let bestFitting: number | null = null;

      const applyZoom = (zoom: number) => {
        zoomRef.current = zoom;
        onZoomChangeRef.current?.(zoom);
      };

      /**
       * Run `next` once the content box has stopped changing.
       *
       * A trial zoom only takes effect after React commits it and the browser
       * re-lays-out the counter-scaled chrome, and under load that can take
       * more than a frame or two. Measuring on a fixed rAF delay reads the
       * *previous* layout and makes the search converge on a wrong answer, so
       * wait for two consecutive identical measurements instead of guessing.
       */
      const whenSettled = (next: () => void) => {
        let previous = '';
        let frames = 0;
        const tick = () => {
          const rect = content.getBoundingClientRect();
          const signature = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
          if (signature === previous || frames > 20) {
            next();
            return;
          }
          previous = signature;
          frames += 1;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };

      const step = () => {
        const area = usableArea();
        const rect = content.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const ratio = Math.min(area.width / rect.width, area.height / rect.height);
        if (ratio >= 1) {
          bestFitting = zoomRef.current;
          low = zoomRef.current;
        } else {
          high = zoomRef.current;
        }

        passes += 1;
        const snug = ratio >= 1 && ratio <= 1.04;
        if (snug || passes >= MAX_PASSES || high - low < 0.01) {
          const settled = bestFitting ?? minZoomRef.current;
          if (Math.abs(settled - zoomRef.current) > 0.001) {
            applyZoom(settled);
            whenSettled(centreContent);
          } else {
            centreContent();
          }
          return;
        }

        applyZoom((low + high) / 2);
        whenSettled(step);
      };

      whenSettled(step);
    }, []);

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
