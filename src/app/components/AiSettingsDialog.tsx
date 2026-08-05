import { useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, ExternalLink, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AiSettings, COPY_MODELS, CopyModel } from '../services/ai/types';
import { clearAiSettings, maskKey, saveAiSettings } from '../services/ai/settings';

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AiSettings;
  onSettingsChange: (settings: AiSettings) => void;
}

export function AiSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: AiSettingsDialogProps) {
  // Local draft so typing doesn't rewrite storage on every keystroke
  const [draft, setDraft] = useState<AiSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const handleSave = () => {
    const cleaned: AiSettings = {
      anthropicApiKey: draft.anthropicApiKey.trim(),
      geminiApiKey: draft.geminiApiKey.trim(),
      copyModel: draft.copyModel,
    };
    saveAiSettings(cleaned);
    onSettingsChange(cleaned);
    onOpenChange(false);
  };

  const handleForget = () => {
    clearAiSettings();
    const empty: AiSettings = { anthropicApiKey: '', geminiApiKey: '', copyModel: draft.copyModel };
    setDraft(empty);
    onSettingsChange(empty);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            AI settings
          </DialogTitle>
          <DialogDescription>
            Bring your own API keys to generate ad copy and background images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Honest statement of the trade-off — there is no backend here. */}
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              BannerCanva has no server, so keys are stored in this browser&apos;s local storage and
              requests go directly from your browser to Anthropic and Google. Use keys scoped to
              this purpose, and avoid this on a shared computer.
            </p>
          </div>

          {/* Anthropic */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Anthropic API key <span className="font-normal text-gray-400">— ad copy</span>
            </Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                settings.anthropicApiKey ? maskKey(settings.anthropicApiKey) : 'sk-ant-…'
              }
              value={draft.anthropicApiKey}
              onChange={(e) => setDraft({ ...draft, anthropicApiKey: e.target.value })}
              className="h-8 text-xs font-mono"
            />
            <a
              href="https://platform.claude.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            >
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">Copywriting model</Label>
            <Select
              value={draft.copyModel}
              onValueChange={(value) => setDraft({ ...draft, copyModel: value as CopyModel })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COPY_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gemini */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Google Gemini API key{' '}
              <span className="font-normal text-gray-400">— background images</span>
            </Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={settings.geminiApiKey ? maskKey(settings.geminiApiKey) : 'AIza…'}
              value={draft.geminiApiKey}
              onChange={(e) => setDraft({ ...draft, geminiApiKey: e.target.value })}
              className="h-8 text-xs font-mono"
            />
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            >
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleForget}
              className="gap-1.5 text-red-600 hover:bg-red-50"
              title="Remove both keys from this browser"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Forget keys
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
