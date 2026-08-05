import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function ZoomControls({
  zoom,
  onZoomChange,
  minZoom = 0.25,
  maxZoom = 1,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 shadow-lg border border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.25))}
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
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.25))}
        disabled={zoom >= maxZoom}
        className="h-7 w-7 p-0"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
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
