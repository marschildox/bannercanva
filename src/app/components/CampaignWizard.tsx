import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Wand2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BannerContent } from '../types/banner';
import { AiSettings, AiError, CopyBrief, CopyVariant } from '../services/ai/types';
import { generateCopy } from '../services/ai/copy';
import { generateBackgroundImage } from '../services/ai/image';
import {
  BRAND_FONTS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_TONES,
  CampaignBrand,
  DEFAULT_BRAND,
  buildCampaignContent,
} from '../data/campaign-brief';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiSettings: AiSettings;
  onOpenAiSettings: () => void;
  onComplete: (content: BannerContent, options: { horizontal: boolean; vertical: boolean }) => void;
  onNotify: (message: string, kind: 'success' | 'error') => void;
}

const STEPS = ['Campaign', 'Brand', 'Copy'] as const;

const EMPTY_COPY: CopyVariant = { headline: '', subheadline: '', cta: '' };

export function CampaignWizard({
  open,
  onOpenChange,
  aiSettings,
  onOpenAiSettings,
  onComplete,
  onNotify,
}: CampaignWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1 — campaign
  const [product, setProduct] = useState('');
  const [objective, setObjective] = useState<string>(CAMPAIGN_OBJECTIVES[0]);
  const [tone, setTone] = useState<string>(CAMPAIGN_TONES[0]);
  const [audience, setAudience] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2 — brand
  const [brand, setBrand] = useState<CampaignBrand>({ ...DEFAULT_BRAND });
  const [bgPrompt, setBgPrompt] = useState('');
  const [generatingBg, setGeneratingBg] = useState(false);

  // Step 3 — copy
  const [variants, setVariants] = useState<CopyVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [manualCopy, setManualCopy] = useState<CopyVariant>({ ...EMPTY_COPY });
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [addHorizontal, setAddHorizontal] = useState(true);
  const [addVertical, setAddVertical] = useState(true);

  const canContinue = step !== 0 || product.trim().length > 0;
  const chosenCopy = variants[selectedVariant] ?? manualCopy;
  const canCreate = chosenCopy.headline.trim().length > 0 && chosenCopy.cta.trim().length > 0;

  const reset = () => {
    setStep(0);
    setProduct('');
    setObjective(CAMPAIGN_OBJECTIVES[0]);
    setTone(CAMPAIGN_TONES[0]);
    setAudience('');
    setNotes('');
    setBrand({ ...DEFAULT_BRAND });
    setBgPrompt('');
    setVariants([]);
    setSelectedVariant(0);
    setManualCopy({ ...EMPTY_COPY });
  };

  const handleGenerateCopy = async () => {
    if (generatingCopy) return;
    setGeneratingCopy(true);
    try {
      const brief: CopyBrief = { product, objective, tone, audience, notes, variants: 3 };
      const generated = await generateCopy(brief, aiSettings.anthropicApiKey, aiSettings.copyModel);
      setVariants(generated);
      setSelectedVariant(0);
      onNotify(`${generated.length} copy options generated`, 'success');
    } catch (error) {
      onNotify(error instanceof AiError ? error.message : 'Copy generation failed.', 'error');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleGenerateBackground = async () => {
    if (generatingBg || !bgPrompt.trim()) return;
    setGeneratingBg(true);
    try {
      const dataUrl = await generateBackgroundImage(
        { prompt: bgPrompt, aspectRatio: '1:1' },
        aiSettings.geminiApiKey,
      );
      setBrand((b) => ({ ...b, backgroundImage: dataUrl }));
      onNotify('Background generated', 'success');
    } catch (error) {
      onNotify(error instanceof AiError ? error.message : 'Background generation failed.', 'error');
    } finally {
      setGeneratingBg(false);
    }
  };

  const readAsDataUrl = (file: File, apply: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => apply(reader.result as string);
    reader.readAsDataURL(file);
  };

  const pickFile = (apply: (dataUrl: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) readAsDataUrl(file, apply);
    };
    input.click();
  };

  const handleCreate = () => {
    onComplete(buildCampaignContent(chosenCopy, brand), {
      horizontal: addHorizontal,
      vertical: addVertical,
    });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            New campaign
          </DialogTitle>
          <DialogDescription>
            Answer three short steps and BannerCanva builds the master design plus a starter set of
            formats.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  index === step
                    ? 'text-blue-600'
                    : index < step
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                    index === step
                      ? 'bg-blue-600 text-white'
                      : index < step
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index < step ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {label}
              </div>
              {index < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="min-h-[280px]">
          {/* ═══ STEP 1 — CAMPAIGN ═══ */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  What are you advertising? <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ergonomic standing desk for home offices"
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Objective</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_OBJECTIVES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TONES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Audience</Label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Remote software engineers, 25–45"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Must-mention details</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="30-day returns, free shipping"
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-gray-400">
                  The copywriter never invents facts — anything factual has to come from here.
                </p>
              </div>
            </div>
          )}

          {/* ═══ STEP 2 — BRAND ═══ */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Logo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Logo</Label>
                  {brand.logo ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 flex items-center justify-center h-14">
                      <img src={brand.logo} alt="Logo" className="max-h-10 object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 h-14 flex items-center justify-center text-[11px] text-gray-400">
                      No logo
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => pickFile((url) => setBrand((b) => ({ ...b, logo: url })))}
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    {brand.logo ? 'Change logo' : 'Upload logo'}
                  </Button>
                </div>

                {/* Background */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Background</Label>
                  {brand.backgroundImage ? (
                    <div className="rounded-lg border border-gray-200 overflow-hidden h-14">
                      <img
                        src={brand.backgroundImage}
                        alt="Background"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 h-14 flex items-center justify-center text-[11px] text-gray-400">
                      Solid color
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() =>
                      pickFile((url) => setBrand((b) => ({ ...b, backgroundImage: url })))
                    }
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    Upload image
                  </Button>
                </div>
              </div>

              {/* AI background */}
              <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  <Label className="text-xs font-semibold text-violet-900">
                    Or generate a background
                  </Label>
                </div>
                {aiSettings.geminiApiKey ? (
                  <div className="flex gap-2">
                    <Input
                      value={bgPrompt}
                      onChange={(e) => setBgPrompt(e.target.value)}
                      placeholder="Sunlit home office, warm wood, soft shadows"
                      className="h-8 text-xs bg-white"
                      disabled={generatingBg}
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-violet-600 hover:bg-violet-700 shrink-0"
                      onClick={() => void handleGenerateBackground()}
                      disabled={generatingBg || !bgPrompt.trim()}
                    >
                      {generatingBg ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={onOpenAiSettings}
                  >
                    <KeyRound className="h-3 w-3 mr-1.5" />
                    Add a Gemini key to generate images
                  </Button>
                )}
              </div>

              {/* Scrim — only meaningful over a photo */}
              {brand.backgroundImage && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-700">Darken background</Label>
                    <span className="text-xs font-mono text-gray-500">{brand.scrimOpacity}%</span>
                  </div>
                  <Slider
                    value={[brand.scrimOpacity]}
                    onValueChange={([value]) => setBrand((b) => ({ ...b, scrimOpacity: value }))}
                    min={0}
                    max={80}
                    step={5}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <Label className="text-xs font-semibold text-gray-700">Font</Label>
                  <Select
                    value={brand.fontFamily}
                    onValueChange={(value) => setBrand((b) => ({ ...b, fontFamily: value }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_FONTS.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Button</Label>
                  <Input
                    type="color"
                    value={brand.ctaBgColor}
                    onChange={(e) => setBrand((b) => ({ ...b, ctaBgColor: e.target.value }))}
                    className="h-8 p-0.5 cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Button text</Label>
                  <Input
                    type="color"
                    value={brand.ctaTextColor}
                    onChange={(e) => setBrand((b) => ({ ...b, ctaTextColor: e.target.value }))}
                    className="h-8 p-0.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 3 — COPY ═══ */}
          {step === 2 && (
            <div className="space-y-3">
              {aiSettings.anthropicApiKey ? (
                <Button
                  size="sm"
                  className="w-full h-9 text-xs bg-violet-600 hover:bg-violet-700"
                  onClick={() => void handleGenerateCopy()}
                  disabled={generatingCopy}
                >
                  {generatingCopy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Writing options…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-2" />
                      {variants.length ? 'Rewrite options' : 'Write copy with AI'}
                    </>
                  )}
                </Button>
              ) : (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 space-y-2">
                  <p className="text-[11px] text-violet-700">
                    Add an Anthropic API key to have Claude write the copy, or type it yourself
                    below.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={onOpenAiSettings}
                  >
                    <KeyRound className="h-3 w-3 mr-1.5" />
                    Open AI settings
                  </Button>
                </div>
              )}

              {/* Generated options */}
              {variants.length > 0 && (
                <div className="space-y-1.5">
                  {variants.map((variant, index) => (
                    <button
                      key={`${variant.headline}-${index}`}
                      onClick={() => setSelectedVariant(index)}
                      className={`w-full text-left rounded-lg border-2 p-2.5 transition-colors ${
                        selectedVariant === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{variant.headline}</div>
                      {variant.subheadline && (
                        <div className="text-xs text-gray-600">{variant.subheadline}</div>
                      )}
                      <div className="mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-semibold text-white bg-gray-800">
                        {variant.cta}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual entry (used when nothing is generated) */}
              {variants.length === 0 && (
                <div className="space-y-2">
                  <Input
                    value={manualCopy.headline}
                    onChange={(e) => setManualCopy({ ...manualCopy, headline: e.target.value })}
                    placeholder="Headline"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={manualCopy.subheadline}
                    onChange={(e) => setManualCopy({ ...manualCopy, subheadline: e.target.value })}
                    placeholder="Subheadline (optional)"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={manualCopy.cta}
                    onChange={(e) => setManualCopy({ ...manualCopy, cta: e.target.value })}
                    placeholder="Button label"
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Starter set */}
              <div className="rounded-lg border border-gray-200 p-2.5 space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Start the board with</Label>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Checkbox checked disabled />
                  Square master (250×250)
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <Checkbox
                    checked={addHorizontal}
                    onCheckedChange={(v) => setAddHorizontal(v === true)}
                  />
                  A horizontal column
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <Checkbox
                    checked={addVertical}
                    onCheckedChange={(v) => setAddVertical(v === true)}
                  />
                  A vertical column
                </label>
                <p className="text-[11px] text-gray-400">
                  Add any other sizes later from the Sizes panel — they inherit this design.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          {step > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="gap-1.5"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={!canCreate} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Create campaign
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
