'use client';

import { memo, type CSSProperties } from 'react';
import { Eye, LoaderCircle, PanelRightClose } from 'lucide-react';
import type { Template } from '@pdfme/common';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PdfTemplateInput } from '@/features/pdf-templates/types';
import { PdfTemplatePreviewPanel } from './PdfTemplatePreviewPanel';

interface PdfTemplateInspectorSidebarProps {
  previewAssignments: Array<{ id: string; title: string }>;
  selectedPreviewEinsatzId: string;
  onSelectPreviewEinsatzId: (value: string) => void;
  onRefreshPreview: () => void;
  isRefreshingPreview: boolean;
  onCollapse: () => void;
  panelStyle?: CSSProperties;
  template: Template;
  input: PdfTemplateInput;
}

export const PdfTemplateInspectorSidebar = memo(function PdfTemplateInspectorSidebar({
  previewAssignments,
  selectedPreviewEinsatzId,
  onSelectPreviewEinsatzId,
  onRefreshPreview,
  isRefreshingPreview,
  onCollapse,
  panelStyle,
  template,
  input,
}: PdfTemplateInspectorSidebarProps) {
  return (
    <div className="min-h-0 self-start pl-1.5" style={panelStyle}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Eye className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-950">
                    Vorschau
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Testdaten und gerenderte PDF-Vorschau.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-xl border-slate-200 bg-white"
                  onClick={onCollapse}
                  aria-label="Rechte Seitenleiste einklappen"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60">
          <section className="border-b border-slate-200 bg-white px-3 py-2.5">
            <div className="grid gap-2.5">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="preview-einsatz"
                  className="text-xs text-slate-600"
                >
                  Testdatensatz
                </Label>
                <Select
                  value={selectedPreviewEinsatzId}
                  onValueChange={onSelectPreviewEinsatzId}
                >
                  <SelectTrigger
                    id="preview-einsatz"
                    className="h-9 rounded-xl bg-white text-sm"
                  >
                    <SelectValue placeholder="Vorschaudaten auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">Testdaten</SelectItem>
                    {previewAssignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl border-slate-200 bg-white"
                onClick={onRefreshPreview}
                disabled={isRefreshingPreview}
              >
                {isRefreshingPreview ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Vorschau aktualisieren
              </Button>
            </div>
          </section>

          <section className="px-3 py-2.5">
            <div className="rounded-[1.1rem] bg-slate-950 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <PdfTemplatePreviewPanel
                template={template}
                input={input}
                className="rounded-[0.9rem] border-slate-800 bg-slate-900"
                viewerClassName="h-[28rem] min-h-[28rem]"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});
