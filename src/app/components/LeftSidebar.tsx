import { useState } from 'react';
import { Layers, LayoutTemplate, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SizesPanel } from './left-sidebar/SizesPanel';
import { InsertPanel } from './left-sidebar/InsertPanel';
import { TemplatesPanel } from './left-sidebar/TemplatesPanel';
import { BannerFormat, BannerContent, SelectedElement } from '../types/banner';

type TabType = 'insert' | 'templates' | 'sizes';

import type { BannerTemplate } from '../data/templates';

interface LeftSidebarProps {
  onAddBannerSize?: (formatId: string) => void;
  onApplyTemplate?: (template: BannerTemplate) => void;
  isMasterSelected?: boolean;
  addedFormatIds?: string[];
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
  onApplyTemplate,
  isMasterSelected,
  addedFormatIds = [],
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
    { id: 'templates' as TabType, label: 'Templates', icon: LayoutTemplate },
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

            return (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                    onCollapsedChange?.(false);
                  }}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-lg transition-all
                    ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                  `}
                  title={tab.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
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

          return (
            <div key={tab.id} className="relative">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-lg transition-all
                  ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
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
        {activeTab === 'templates' && (
          <TemplatesPanel
            onApplyTemplate={onApplyTemplate}
            selectedFormat={selectedFormat}
            isMasterSelected={isMasterSelected}
          />
        )}
        {activeTab === 'sizes' && (
          <SizesPanel
            onAddBannerSize={onAddBannerSize}
            addedFormatIds={addedFormatIds}
            customFormats={customFormats}
            onAddCustomFormat={onAddCustomFormat}
            onDeleteCustomFormat={onDeleteCustomFormat}
          />
        )}
      </div>
    </div>
  );
}
