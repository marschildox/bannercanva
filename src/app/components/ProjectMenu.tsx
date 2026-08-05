import { useRef, useState } from 'react';
import { Download, Upload, FilePlus2, FolderOpen, Check } from 'lucide-react';
import { Button } from './ui/button';
import { BannerColumn, BannerContent } from '../types/banner';
import { deserializeProject, serializeProject } from '../utils/project-storage';

interface ProjectMenuProps {
  columns: BannerColumn[];
  bannerContents: Map<string, BannerContent>;
  onReplaceProject: (
    columns: BannerColumn[] | null,
    contents: Map<string, BannerContent> | null,
  ) => void;
  onNotify: (message: string, kind: 'success' | 'error') => void;
}

/**
 * Project actions: export the whole board to a .json file, import one back,
 * and start a fresh board. Work is autosaved to localStorage continuously —
 * these are for moving a project between machines or keeping versions.
 */
export function ProjectMenu({
  columns,
  bannerContents,
  onReplaceProject,
  onNotify,
}: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bannerCount = columns.reduce((sum, col) => sum + 1 + col.childFormats.length, 0);

  const handleExport = () => {
    const project = serializeProject(columns, bannerContents);
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = project.savedAt.slice(0, 10);
    link.href = url;
    link.download = `bannercanva-project-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    onNotify(`Project exported (${bannerCount} banners)`, 'success');
  };

  const handleImportFile = async (file: File) => {
    try {
      const revived = deserializeProject(JSON.parse(await file.text()));
      if (!revived) {
        onNotify('That file is not a BannerCanva project', 'error');
        return;
      }
      onReplaceProject(revived.columns, revived.contents);
      onNotify(`Project loaded — ${revived.contents.size} banners`, 'success');
    } catch {
      onNotify('Could not read that file', 'error');
    } finally {
      setOpen(false);
    }
  };

  const handleNewProject = () => {
    if (!confirm('Start a new project? The current board will be replaced.')) return;
    onReplaceProject(null, null);
    setOpen(false);
    onNotify('New project started', 'success');
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((v) => !v)}
        title="Project: export, import, or start fresh"
      >
        <FolderOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Project</span>
      </Button>

      {open && (
        <>
          {/* Click-away layer */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl p-1.5">
            <div className="px-2.5 py-2 flex items-center gap-1.5 text-[11px] text-gray-500">
              <Check className="h-3 w-3 text-green-600" />
              Autosaved &bull; {bannerCount} banner{bannerCount !== 1 ? 's' : ''}
            </div>
            <div className="h-px bg-gray-100 my-1" />

            <button
              onClick={handleExport}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm hover:bg-gray-100 transition-colors"
            >
              <Download className="h-4 w-4 text-gray-500 shrink-0" />
              <span>
                <span className="block font-medium text-gray-900">Export project</span>
                <span className="block text-[11px] text-gray-500">Download as .json</span>
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm hover:bg-gray-100 transition-colors"
            >
              <Upload className="h-4 w-4 text-gray-500 shrink-0" />
              <span>
                <span className="block font-medium text-gray-900">Import project</span>
                <span className="block text-[11px] text-gray-500">Replaces the current board</span>
              </span>
            </button>

            <div className="h-px bg-gray-100 my-1" />

            <button
              onClick={handleNewProject}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm hover:bg-red-50 transition-colors"
            >
              <FilePlus2 className="h-4 w-4 text-red-500 shrink-0" />
              <span className="font-medium text-red-600">New project</span>
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
