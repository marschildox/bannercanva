import { useState } from 'react';
import { Layers, LayoutTemplate, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SizesPanel } from './left-sidebar/SizesPanel';
import { InsertPanel } from './left-sidebar/InsertPanel';
import { TemplatesPanel } from './left-sidebar/TemplatesPanel';
import { BannerFormat, BannerContent, SelectedElement } from '../types/banner';
import { Badge } from './ui/badge';

type TabType = 'insert' | 'templates' | 'sizes';

interface LeftSidebarProps {
  onAddBannerSize?: (formatId: string) => void;
  customFormats?: BannerFormat[];
  onAddCustomFormat?: (width: number, height: number, name: string) => BannerFormat;
  onDeleteCustomFormat?: (id: string) => void;
  selectedFormat?: BannerFormat | null;
  content?: BannerContent;
  onContentChange?: (content: BannerContent) => void;
  onElementSelect?: (element: SelectedElement) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function LeftSidebar({
  onAddBannerSize,
  customFormats = [],
  onAddCustomFormat,
  onDeleteCustomFormat,
  selectedFormat = null,
  content,
  onContentChange,
  onElementSelect,
  collapsed = false,
  onCollapsedChange,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('sizes');

  const tabs = [
    { id: 'insert' as TabType, label: 'Insert', icon: Layers },
    {
      id: 'templates' as TabType,
      label: 'Templates',
      icon: LayoutTemplate,
      disabled: true,
      comingSoon: true,
    },
    { id: 'sizes' as TabType, label: 'Sizes', icon: Maximize2 },
  ];

  if (collapsed) {
    return (
      <div className="h-full flex bg-white border-r border-gray-200 shadow-lg">
        {/* Collapsed Tab Icons */}
        <div className="w-16 bg-gray-50 flex flex-col items-center py-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => {
                    if (!isDisabled) {
                      setActiveTab(tab.id);
                      onCollapsedChange?.(false);
                    }
                  }}
                  disabled={isDisabled}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-lg transition-all
                    ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed text-gray-400'
                        : isActive
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                  `}
                  title={tab.comingSoon ? `${tab.label} (Coming Soon)` : tab.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
                {tab.comingSoon && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white" />
                )}
              </div>
            );
          })}

          {/* Expand Button */}
          <div className="flex-1" />
          <button
            onClick={() => onCollapsedChange?.(false)}
            className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition-all"
            title="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white border-r border-gray-200 shadow-lg min-h-0">
      {/* Tabs */}
      <div className="w-20 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2 flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`
                  w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-lg transition-all
                  ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed text-gray-400'
                      : isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
              {tab.comingSoon && (
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-2 text-[8px] px-1 py-0 h-4 bg-yellow-100 text-yellow-700 border-yellow-300"
                >
                  Soon
                </Badge>
              )}
            </div>
          );
        })}

        {/* Collapse Button */}
        <div className="flex-1" />
        <button
          onClick={() => onCollapsedChange?.(true)}
          className="w-16 h-12 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-all"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Content Panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {activeTab === 'insert' && (
          <InsertPanel
            selectedFormat={selectedFormat}
            content={
              content || {
                backgroundImage: '',
                backgroundPosition: 'center',
                shapes: [],
                images: [],
                logo: '',
                logoSize: 100,
                logoPosition: 'top-left',
                logoBackgroundEnabled: false,
                logoBackgroundColor: '#ffffff',
                logoBackgroundOpacity: 80,
                texts: [],
                ctas: [],
                ctaSize: 100,
                ctaBgColor: '#2563eb',
                ctaTextColor: '#ffffff',
                ctaButtonType: 'solid',
                ctaBorderRadius: 8,
                ctaBorderWidth: 2,
                ctaPosition: 'bottom',
                ctaGradient: { enabled: false, from: '#2563eb', to: '#1d4ed8', direction: 'to-r' },
                ctaShadow: { enabled: false, color: '#000000', blur: 10, offsetX: 0, offsetY: 4 },
              }
            }
            onContentChange={onContentChange || (() => {})}
            onElementSelect={onElementSelect}
          />
        )}
        {activeTab === 'templates' && <TemplatesPanel />}
        {activeTab === 'sizes' && (
          <SizesPanel
            onAddBannerSize={onAddBannerSize}
            customFormats={customFormats}
            onAddCustomFormat={onAddCustomFormat}
            onDeleteCustomFormat={onDeleteCustomFormat}
          />
        )}
      </div>
    </div>
  );
}
