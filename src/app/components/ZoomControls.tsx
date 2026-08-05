import { ZoomIn, ZoomOut, Maximize2, Scan } from 'lucide-react';
import { Button } from './ui/button';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onZoomToFit?: () => void;
  minZoom?: number;
  maxZoom?: number;
}

export function ZoomControls({
  zoom,
  onZoomChange,
  onZoomToFit,
  minZoom = 0.1,
  maxZoom = 4,
}: ZoomControlsProps) {
  const zoomOut = () => onZoomChange(Math.max(minZoom, zoom / 1.25));
  const zoomIn = () => onZoomChange(Math.min(maxZoom, zoom * 1.25));

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow-lg border border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomOut}
        disabled={zoom <= minZoom}
        className="h-7 w-7 p-0"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs font-medium min-w-[3rem] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomIn}
        disabled={zoom >= maxZoom}
        className="h-7 w-7 p-0"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      {onZoomToFit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomToFit}
          className="h-7 w-7 p-0"
          title="Zoom to Fit"
        >
          <Scan className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onZoomChange(1)}
        className="h-7 w-7 p-0"
        title="100% (Real Size)"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
