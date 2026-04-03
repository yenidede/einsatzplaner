'use client';

import { memo, type PointerEvent as ReactPointerEvent } from 'react';
import { Type, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { PdfTemplateFieldDefinition } from '@/features/pdf-template/types';

interface SelectedElementState {
  key: string;
  label: string;
  type: string;
  content: string;
  boundFieldKey: string | null;
  fontSize: number;
  fontColor: string;
  letterSpacing: number;
  isBold: boolean;
  align: 'left' | 'center' | 'right';
  formatHint: string | null;
}

interface PdfTemplateElementRendererProps {
  selectedElement: SelectedElementState;
  fields: PdfTemplateFieldDefinition[];
  onClose: () => void;
  onMoveStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onUpdateBoundField: (fieldKey: string) => void;
  onUpdateFontSize: (value: number) => void;
  onToggleBold: (value: boolean) => void;
  onUpdateAlignment: (value: 'left' | 'center' | 'right') => void;
  onUpdateFontColor: (value: string) => void;
  onUpdateLetterSpacing: (value: number) => void;
}

export const PdfTemplateElementRenderer = memo(function PdfTemplateElementRenderer({
  selectedElement,
  fields,
  onClose,
  onMoveStart,
  onResizeStart,
  onUpdateBoundField,
  onUpdateFontSize,
  onToggleBold,
  onUpdateAlignment,
  onUpdateFontColor,
  onUpdateLetterSpacing,
}: PdfTemplateElementRendererProps) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.22)]">
      <div
        className="flex cursor-move items-start justify-between gap-3 border-b border-slate-200 px-5 py-4"
        onPointerDown={onMoveStart}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <Type className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Element bearbeiten
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectedElement.label}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Overlay schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-semibold text-slate-600"
          >
            {selectedElement.type}
          </Badge>
          {selectedElement.formatHint ? (
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-semibold text-slate-600"
            >
              {selectedElement.formatHint}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] text-slate-600">Gebundenes Feld</Label>
            <Select
              value={selectedElement.boundFieldKey ?? undefined}
              onValueChange={onUpdateBoundField}
            >
              <SelectTrigger className="h-9 rounded-xl bg-white text-sm">
                <SelectValue placeholder="Feld auswählen" />
              </SelectTrigger>
              <SelectContent className="z-[140]">
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-slate-600">Schriftgröße</Label>
              <Input
                type="number"
                min={6}
                max={48}
                value={selectedElement.fontSize}
                onChange={(event) =>
                  onUpdateFontSize(Number(event.target.value) || selectedElement.fontSize)
                }
                className="h-9 rounded-xl bg-white text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px] text-slate-600">Zeichenabstand</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={selectedElement.letterSpacing}
                onChange={(event) => {
                  const parsedValue = Number(event.target.value);
                  onUpdateLetterSpacing(
                    Number.isNaN(parsedValue)
                      ? selectedElement.letterSpacing
                      : parsedValue
                  );
                }}
                className="h-9 rounded-xl bg-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px] text-slate-600">Ausrichtung</Label>
              <Select
                value={selectedElement.align}
                onValueChange={onUpdateAlignment}
              >
                <SelectTrigger className="h-9 rounded-xl bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[140]">
                  <SelectItem value="left">Links</SelectItem>
                  <SelectItem value="center">Zentriert</SelectItem>
                  <SelectItem value="right">Rechts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[11px] text-slate-600">Schriftfarbe</Label>
              <Input
                type="color"
                value={selectedElement.fontColor}
                onChange={(event) => onUpdateFontColor(event.target.value)}
                className="h-9 rounded-xl bg-white p-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="text-sm text-slate-700">Fett</div>
            <Switch
              checked={selectedElement.isBold}
              onCheckedChange={onToggleBold}
              aria-label="Fett umschalten"
            />
          </div>
        </div>
      </div>

      <div
        className="absolute right-2 bottom-2 h-5 w-5 cursor-se-resize rounded-md border border-slate-200 bg-white/90 shadow-sm"
        onPointerDown={onResizeStart}
        aria-hidden="true"
      />
    </div>
  );
});

export { PdfTemplateElementRenderer as PdfTemplateElementInspectorOverlay };
