import { useState } from 'react';
import { Search, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
  SQUARE_FORMATS,
  HORIZONTAL_FORMATS,
  VERTICAL_FORMATS,
  BannerFormat,
} from '../../types/banner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface SizesPanelProps {
  onAddBannerSize?: (formatId: string) => void;
  customFormats?: BannerFormat[];
  onAddCustomFormat?: (width: number, height: number, name: string) => BannerFormat;
  onDeleteCustomFormat?: (id: string) => void;
}

interface FormatCategory {
  id: string;
  name: string;
  formats: BannerFormat[];
}

export function SizesPanel({
  onAddBannerSize,
  customFormats = [],
  onAddCustomFormat,
  onDeleteCustomFormat,
}: SizesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['square', 'horizontal', 'vertical', 'custom']),
  );
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  // Organize custom formats by category
  const customSquare = customFormats.filter((f) => f.category === 'square');
  const customHorizontal = customFormats.filter((f) => f.category === 'horizontal');
  const customVertical = customFormats.filter((f) => f.category === 'vertical');

  // Organize formats by category
  const categories: FormatCategory[] = [
    {
      id: 'custom',
      name: 'Custom Sizes',
      formats: customFormats,
    },
    {
      id: 'square',
      name: 'Square (1:1)',
      formats: SQUARE_FORMATS,
    },
    {
      id: 'horizontal',
      name: 'Horizontal',
      formats: HORIZONTAL_FORMATS,
    },
    {
      id: 'vertical',
      name: 'Vertical',
      formats: VERTICAL_FORMATS,
    },
  ];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCustom = () => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      alert('Please enter valid dimensions');
      return;
    }

    if (!customName.trim()) {
      alert('Please enter a name');
      return;
    }

    if (onAddCustomFormat) {
      onAddCustomFormat(width, height, customName);
      setCustomName('');
      setCustomWidth('');
      setCustomHeight('');
      setShowCustomDialog(false);
    }
  };

  // Filter formats by search query
  const filterFormats = (formats: BannerFormat[]) => {
    if (!searchQuery.trim()) return formats;

    const query = searchQuery.toLowerCase();
    return formats.filter(
      (format) =>
        format.name.toLowerCase().includes(query) ||
        `${format.width}x${format.height}`.includes(query) ||
        `${format.width} x ${format.height}`.includes(query),
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold mb-3">Banner Sizes</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder='Try "leaderboard" or "1080"'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50"
          />
        </div>

        {/* Count */}
        <div className="mt-3 text-sm text-gray-600">
          {customFormats.length > 0 && `${customFormats.length} custom, `}
          {SQUARE_FORMATS.length + HORIZONTAL_FORMATS.length + VERTICAL_FORMATS.length} preset sizes
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {/* Create Custom Size */}
          <button
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-orange-300 hover:bg-orange-50 hover:border-orange-400 transition-colors mb-4"
            onClick={() => setShowCustomDialog(true)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded bg-orange-100">
              <Plus className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-900">Create Custom Size</div>
              <div className="text-xs text-gray-500">Add new custom dimensions</div>
            </div>
          </button>

          {/* Categories */}
          {categories.map((category) => {
            // Skip custom category if empty and not searching
            if (category.id === 'custom' && category.formats.length === 0 && !searchQuery) {
              return null;
            }

            const filteredFormats = filterFormats(category.formats);
            if (filteredFormats.length === 0 && searchQuery) return null;

            const isExpanded = expandedCategories.has(category.id);
            const isCustom = category.id === 'custom';

            return (
              <div key={category.id} className="mb-2">
                {/* Category Header */}
                <div
                  className={`flex items-center gap-2 h-10 px-2 rounded-lg cursor-pointer ${
                    isCustom ? 'bg-orange-100 hover:bg-orange-150' : 'bg-gray-100 hover:bg-gray-150'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          isCustom ? 'text-orange-700' : 'text-gray-600'
                        }`}
                      >
                        {category.name}
                      </span>
                      <span className="text-xs text-gray-500">({filteredFormats.length})</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {filteredFormats.map((format) => {
                      return (
                        <div
                          key={format.id}
                          className="flex items-center gap-2 h-12 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {format.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format.width} × {format.height} px
                              <span className="text-gray-400 ml-2">
                                ({format.aspectRatio.toFixed(2)})
                              </span>
                            </div>
                          </div>

                          {/* Delete button for custom formats */}
                          {isCustom && onDeleteCustomFormat && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${format.name}"?`)) {
                                  onDeleteCustomFormat(format.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity"
                              title="Delete custom size"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Custom Size Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Size</DialogTitle>
            <DialogDescription>
              Define a custom banner size. It will be automatically categorized by its aspect ratio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                type="text"
                placeholder="e.g., My Custom Banner"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Width (px)</label>
                <Input
                  type="number"
                  placeholder="1920"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  min="1"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Height (px)</label>
                <Input
                  type="number"
                  placeholder="1080"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {/* Preview aspect ratio */}
            {customWidth &&
              customHeight &&
              !isNaN(parseInt(customWidth)) &&
              !isNaN(parseInt(customHeight)) && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs font-medium text-blue-900 mb-1">
                    Auto-detected category:
                  </div>
                  <div className="text-sm text-blue-700">
                    {(() => {
                      const ratio = parseInt(customWidth) / parseInt(customHeight);
                      if (ratio === 1) return '📐 Square (1:1)';
                      if (ratio > 1) return `📏 Horizontal (${ratio.toFixed(2)})`;
                      return `📱 Vertical (${ratio.toFixed(2)})`;
                    })()}
                  </div>
                </div>
              )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCustomDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustom}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Create Size
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
