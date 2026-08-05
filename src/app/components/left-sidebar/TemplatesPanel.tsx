import { LayoutTemplate } from 'lucide-react';

export function TemplatesPanel() {
  const templates = [
    {
      id: 'modern',
      name: 'Modern',
      preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      preview: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=300&fit=crop',
    },
    {
      id: 'bold',
      name: 'Bold',
      preview: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=400&h=300&fit=crop',
    },
    {
      id: 'elegant',
      name: 'Elegant',
      preview: 'https://images.unsplash.com/photo-1618556450991-2f1af64e8191?w=400&h=300&fit=crop',
    },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a template to start</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
              onClick={() => console.log('Select template:', template.id)}
            >
              <img
                src={template.preview}
                alt={template.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                <span className="text-white text-sm font-medium">{template.name}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        <div className="mt-8 text-center text-gray-400">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">More templates coming soon</p>
        </div>
      </div>
    </div>
  );
}
