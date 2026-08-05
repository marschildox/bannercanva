import { BannerContent } from '../../types/banner';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface BackgroundEditorProps {
  content: BannerContent;
  onContentChange: (content: BannerContent) => void;
}

export function BackgroundEditor({ content, onContentChange }: BackgroundEditorProps) {
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onContentChange({ ...content, backgroundImage: base64String });
    };
    reader.readAsDataURL(file);
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
          <div className="space-y-3">
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
