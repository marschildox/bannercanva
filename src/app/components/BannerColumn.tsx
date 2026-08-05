import { useState } from 'react';
import { BannerCanvas } from './BannerCanvas';
import {
  BannerContent,
  BannerFormat,
  BannerColumn as BannerColumnType,
  SQUARE_FORMATS,
  HORIZONTAL_FORMATS,
  VERTICAL_FORMATS,
  SelectedElement,
} from '../types/banner';
import { Plus, ArrowDown, Info, HelpCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { FixedScale } from './FixedScale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

interface BannerColumnProps {
  column: BannerColumnType;
  columnIndex: number;
  selectedFormatId: string | null;
  activeBannerId?: string | null;
  getContent: (formatId: string) => BannerContent;
  onBannerClick: (formatId: string) => void;
  onAddChildren: (columnIndex: number, formats: BannerFormat[]) => void;
  onRemoveChild: (columnIndex: number, formatId: string) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  zoom: number;
  customFormats?: BannerFormat[];
  selectedElement?: SelectedElement;
  onElementSelect?: (element: SelectedElement) => void;
  onContentUpdate?: (formatId: string, content: Partial<BannerContent>) => void;
  // Multi-selection & group support
  multiSelectedIds?: string[];
  onMultiSelect?: (elementId: string) => void;
}

export function BannerColumn({
  column,
  columnIndex,
  selectedFormatId,
  activeBannerId,
  getContent,
  onBannerClick,
  onAddChildren,
  onRemoveChild,
  onDeleteColumn,
  zoom,
  customFormats = [],
  selectedElement,
  onElementSelect,
  onContentUpdate,
  multiSelectedIds,
  onMultiSelect,
}: BannerColumnProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const presetFormats =
    column.category === 'square'
      ? SQUARE_FORMATS
      : column.category === 'horizontal'
        ? HORIZONTAL_FORMATS
        : VERTICAL_FORMATS;

  // Combine preset and custom formats
  const availableFormats = [...presetFormats, ...customFormats];

  const unusedFormats = availableFormats.filter(
    (f) => f.id !== column.masterFormat.id && !column.childFormats.find((cf) => cf.id === f.id),
  );

  const handleAddFormats = (selectedIds: string[]) => {
    const formatsToAdd = availableFormats.filter((f) => selectedIds.includes(f.id));
    onAddChildren(columnIndex, formatsToAdd);
    setShowAddDialog(false);
  };

  const getCategoryLabel = () => {
    switch (column.category) {
      case 'square':
        return '1:1 Square';
      case 'horizontal':
        return 'Horizontal';
      case 'vertical':
        return 'Vertical';
    }
  };

  const isSuperMaster = columnIndex === 0;

  return (
    <div className="flex flex-col items-center gap-10 relative group/column">
      {/* Delete Column Button - Only for non-super-master columns */}
      {!isSuperMaster && onDeleteColumn && (
        <FixedScale
          zoom={zoom}
          className="absolute -top-2 -right-2 opacity-0 group-hover/column:opacity-100 transition-opacity z-10"
        >
          <Button
            size="sm"
            variant="destructive"
            className="h-7 w-7 p-0 shadow-md rounded-full"
            onClick={() => onDeleteColumn(columnIndex)}
            title="Delete entire column"
          >
            <X className="h-4 w-4" />
          </Button>
        </FixedScale>
      )}

      {/* Category Header */}
      <FixedScale zoom={zoom} className="flex items-center gap-4">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-700 mb-1">{getCategoryLabel()}</h3>
          <div className="h-1 w-20 bg-blue-500 rounded-full mx-auto" />
        </div>
      </FixedScale>

      {/* Master Banner */}
      <BannerCanvas
        id={column.masterFormat.id}
        format={column.masterFormat}
        content={getContent(column.masterFormat.id)}
        isMaster={true}
        isSuperMaster={isSuperMaster}
        isActive={activeBannerId === column.masterFormat.id}
        onSelect={() => onBannerClick(column.masterFormat.id)}
        isSelected={selectedFormatId === column.masterFormat.id}
        zoom={zoom}
        selectedElement={selectedElement}
        onElementSelect={onElementSelect}
        onContentUpdate={
          onContentUpdate
            ? (content) => onContentUpdate(column.masterFormat.id, content)
            : undefined
        }
        multiSelectedIds={multiSelectedIds}
        onMultiSelect={onMultiSelect}
      />

      {/* Propagation Arrow - Show if there are children */}
      {column.childFormats.length > 0 && (
        <FixedScale zoom={zoom} className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
            <ArrowDown className="h-5 w-5 text-white" />
          </div>
        </FixedScale>
      )}

      {/* Child Banners */}
      {column.childFormats.map((format, index) => (
        <div key={format.id} className="flex flex-col items-center gap-10">
          <BannerCanvas
            id={format.id}
            format={format}
            content={getContent(format.id)}
            isMaster={false}
            isSuperMaster={false}
            isActive={activeBannerId === format.id}
            onSelect={() => onBannerClick(format.id)}
            onDelete={() => onRemoveChild(columnIndex, format.id)}
            isSelected={selectedFormatId === format.id}
            zoom={zoom}
            selectedElement={selectedElement}
            onElementSelect={onElementSelect}
            onContentUpdate={
              onContentUpdate ? (content) => onContentUpdate(format.id, content) : undefined
            }
            multiSelectedIds={multiSelectedIds}
            onMultiSelect={onMultiSelect}
          />

          {/* Show arrow between children if not the last one */}
          {index < column.childFormats.length - 1 && (
            <FixedScale
              zoom={zoom}
              className="h-8 w-8 rounded-full bg-orange-400 flex items-center justify-center shadow-sm"
            >
              <ArrowDown className="h-4 w-4 text-white" />
            </FixedScale>
          )}
        </div>
      ))}

      {/* Add More Button */}
      {unusedFormats.length > 0 && (
        <>
          <FixedScale zoom={zoom}>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              className="w-full max-w-[300px] border-2 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More Formats
            </Button>
          </FixedScale>

          <AddFormatsDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            formats={unusedFormats}
            category={column.category}
            onAdd={handleAddFormats}
          />
        </>
      )}
    </div>
  );
}

interface AddFormatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formats: BannerFormat[];
  category: string;
  onAdd: (selectedIds: string[]) => void;
}

function AddFormatsDialog({ open, onOpenChange, formats, category, onAdd }: AddFormatsDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFormat = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAdd = () => {
    if (selected.length > 0) {
      onAdd(selected);
      setSelected([]);
      setSearchQuery('');
    }
  };

  const selectAll = () => {
    setSelected(filteredFormats.map((f) => f.id));
  };

  // Filter formats by search query
  const filteredFormats = searchQuery.trim()
    ? formats.filter(
        (format) =>
          format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${format.width}x${format.height}`.includes(searchQuery) ||
          `${format.width} x ${format.height}`.includes(searchQuery),
      )
    : formats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {category} formats</DialogTitle>
          <DialogDescription>
            Select the formats you want to add to your banner collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search formats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Info Banner - Custom Formats */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <Info className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-orange-900">
                <span className="font-medium">Need a custom format?</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center ml-1 text-orange-600 hover:text-orange-700">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Go to the <strong>Sizes</strong> tab in the left sidebar to create custom
                      banner sizes. They'll automatically appear here, organized by aspect ratio
                      (Square, Horizontal, or Vertical).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                Create custom sizes in the <strong>Sizes</strong> panel (left sidebar)
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {selected.length} format{selected.length !== 1 ? 's' : ''} selected
            </p>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All ({filteredFormats.length})
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-2 gap-3">
              {filteredFormats.map((format) => {
                const isSelected = selected.includes(format.id);
                return (
                  <div
                    key={format.id}
                    onClick={() => toggleFormat(format.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{format.name}</h4>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {format.width} × {format.height} px
                      </p>
                      <Badge variant="secondary" className="w-fit text-xs">
                        {format.aspectRatio.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selected.length === 0}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              Add {selected.length} Format{selected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
