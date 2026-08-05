import { useState } from 'react';
import { BannerContent, BannerFormat } from '../../types/banner';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Upload, Sparkles, Loader2, KeyRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { generateBackgroundImage, aspectRatioLabel } from '../../services/ai/image';
import { AiError } from '../../services/ai/types';

interface BackgroundEditorProps {
  content: BannerContent;
  onContentChange: (content: BannerContent) => void;
  /** Used to steer the generated image's composition */
  selectedFormat?: BannerFormat | null;
  geminiApiKey?: string;
  onOpenAiSettings?: () => void;
  onNotify?: (message: string, kind: 'success' | 'error') => void;
}

export function BackgroundEditor({
  content,
  onContentChange,
  selectedFormat,
  geminiApiKey = '',
  onOpenAiSettings,
  onNotify,
}: BackgroundEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onContentChange({ ...content, backgroundImage: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (generating || !prompt.trim()) return;
    setGenerating(true);
    try {
      const ratio = selectedFormat
        ? aspectRatioLabel(selectedFormat.width, selectedFormat.height)
        : '1:1';
      const dataUrl = await generateBackgroundImage({ prompt, aspectRatio: ratio }, geminiApiKey);
      onContentChange({ ...content, backgroundImage: dataUrl });
      onNotify?.('Background generated', 'success');
    } catch (error) {
      onNotify?.(
        error instanceof AiError ? error.message : 'Background generation failed.',
        'error',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-8">
        <TabsTrigger value="content" className="text-xs">
          Content
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-xs">
          Layout
        </TabsTrigger>
      </TabsList>

      {/* CONTENT TAB */}
      <TabsContent value="content" className="mt-3">
        <div className="pr-1">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Background Image</h3>

              {/* Current Image Preview */}
              {content.backgroundImage && (
                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={content.backgroundImage}
                    alt="Background"
                    className="w-full h-24 object-cover"
                  />
                </div>
              )}

              {/* Upload Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  };
                  input.click();
                }}
              >
                <Upload className="h-3 w-3 mr-2" />
                {content.backgroundImage ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>

            {/* ── Generate with AI ── */}
            <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                <Label className="text-xs font-semibold text-violet-900">Generate with AI</Label>
                {selectedFormat && (
                  <span className="ml-auto text-[10px] font-mono text-violet-500">
                    {aspectRatioLabel(selectedFormat.width, selectedFormat.height)}
                  </span>
                )}
              </div>

              {geminiApiKey ? (
                <>
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleGenerate();
                    }}
                    placeholder="Sunlit minimalist office, soft shadows"
                    className="h-8 text-xs bg-white"
                    disabled={generating}
                  />
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700"
                    onClick={() => void handleGenerate()}
                    disabled={generating || !prompt.trim()}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Generate background
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-violet-600/80 leading-snug">
                    Images are generated without text so headlines stay readable on top.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-violet-700 leading-snug">
                    Add a Google Gemini API key to generate backgrounds from a description.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={onOpenAiSettings}
                  >
                    <KeyRound className="h-3 w-3 mr-2" />
                    Open AI settings
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* LAYOUT TAB */}
      <TabsContent value="layout" className="mt-3">
        <div className="pr-1">
          <div className="space-y-3">
            {/* Background Position */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Position</Label>
              <Select
                value={content.backgroundPosition}
                onValueChange={(value) =>
                  onContentChange({ ...content, backgroundPosition: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="top left">Top Left</SelectItem>
                  <SelectItem value="top right">Top Right</SelectItem>
                  <SelectItem value="bottom left">Bottom Left</SelectItem>
                  <SelectItem value="bottom right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
