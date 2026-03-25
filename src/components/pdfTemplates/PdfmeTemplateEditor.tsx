'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Template } from '@pdfme/common';
import {
  Eye,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
  createPdfTemplate,
  getPdfPreviewInput,
  updatePdfTemplate,
} from '@/app/actions/pdfTemplates';
import { PdfTemplateFieldSidebar } from './PdfTemplateFieldSidebar';
import { PdfTemplatePreviewPanel } from './PdfTemplatePreviewPanel';
import { getPdfmePlugins } from '@/features/pdf-templates/pdf-template-default';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateInput,
} from '@/features/pdf-templates/types';
import { insertFieldIntoTemplate } from '@/features/pdf-templates/insert-field-into-template';

interface PdfmeTemplateEditorProps {
  organizationId: string;
  templateId?: string;
  initialName: string;
  initialTemplate: Template;
  initialSampleEinsatzId: string | null;
  previewAssignments: Array<{ id: string; title: string }>;
  fields: PdfTemplateFieldDefinition[];
}

type DesignerInstance = {
  destroy: () => void;
  getTemplate: () => Template;
  updateTemplate: (template: Template) => void;
  getPageCursor: () => number;
};

export function PdfmeTemplateEditor({
  organizationId,
  templateId,
  initialName,
  initialTemplate,
  initialSampleEinsatzId,
  previewAssignments,
  fields,
}: PdfmeTemplateEditorProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const designerRef = useRef<DesignerInstance | null>(null);
  const [name, setName] = useState(initialName);
  const [previewTemplate, setPreviewTemplate] =
    useState<Template>(initialTemplate);
  const [previewInput, setPreviewInput] = useState<PdfTemplateInput>({});
  const [selectedPreviewEinsatzId, setSelectedPreviewEinsatzId] =
    useState<string>(initialSampleEinsatzId ?? 'mock');
  const [isFieldSidebarOpen, setIsFieldSidebarOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function initializeDesigner() {
      if (!containerRef.current) {
        return;
      }

      const { Designer } = await import('@pdfme/ui');

      if (cancelled || !containerRef.current) {
        return;
      }

      designerRef.current?.destroy();

      const instance = new Designer({
        domContainer: containerRef.current,
        template: initialTemplate,
        options: {
          lang: 'de',
          zoomLevel: 0.9,
          sidebarOpen: true,
        },
        plugins: getPdfmePlugins(),
      });

      designerRef.current = {
        destroy: () => instance.destroy(),
        getTemplate: () => instance.getTemplate(),
        updateTemplate: (template) => instance.updateTemplate(template),
        getPageCursor: () => instance.getPageCursor(),
      };
    }

    void initializeDesigner();

    return () => {
      cancelled = true;
      designerRef.current?.destroy();
      designerRef.current = null;
    };
  }, [initialTemplate]);

  useEffect(() => {
    async function loadPreviewInput() {
      const input = await getPdfPreviewInput(
        selectedPreviewEinsatzId === 'mock' ? null : selectedPreviewEinsatzId
      );
      setPreviewInput(input);
    }

    void loadPreviewInput();
  }, [selectedPreviewEinsatzId]);

  async function refreshPreview() {
    const template = designerRef.current?.getTemplate();

    if (!template) {
      return;
    }

    setPreviewTemplate(template);
  }

  function handleInsertField(field: PdfTemplateFieldDefinition) {
    const template = designerRef.current?.getTemplate();
    const pageCursor = designerRef.current?.getPageCursor() ?? 0;

    if (!template) {
      toast.error('Designer ist nicht initialisiert');
      return;
    }

    const nextTemplate = insertFieldIntoTemplate({
      template,
      field,
      pageIndex: pageCursor,
    });

    designerRef.current?.updateTemplate(nextTemplate);
    setPreviewTemplate(nextTemplate);
    toast.success(`"${field.label}" wurde eingefuegt`);
  }

  async function saveTemplate() {
    startSaving(async () => {
      try {
        const template = designerRef.current?.getTemplate();

        if (!template) {
          toast.error('Designer ist nicht initialisiert');
          return;
        }

        const payload = {
          name,
          template,
          sampleEinsatzId:
            selectedPreviewEinsatzId === 'mock'
              ? null
              : selectedPreviewEinsatzId,
        };

        if (templateId) {
          await updatePdfTemplate(templateId, payload);
          toast.success('Vorlage gespeichert');
          setPreviewTemplate(template);
          router.refresh();
          return;
        }

        const created = await createPdfTemplate({
          organizationId,
          ...payload,
        });

        toast.success('Vorlage erstellt');
        router.push(
          `/settings/pdf-templates/${created.id}/edit?orgId=${organizationId}`
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Vorlage konnte nicht gespeichert werden'
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 -mx-4 border-b bg-white/95 px-4 py-4 shadow-sm backdrop-blur xl:mx-0 xl:rounded-xl xl:border">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-2 xl:min-w-96">
            <Label htmlFor="pdf-template-name">Vorlagenname</Label>
            <Input
              id="pdf-template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Buchungsbestaetigung"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-2 sm:min-w-72">
              <Label htmlFor="preview-einsatz">Vorschaudaten</Label>
              <Select
                value={selectedPreviewEinsatzId}
                onValueChange={setSelectedPreviewEinsatzId}
              >
                <SelectTrigger id="preview-einsatz">
                  <SelectValue placeholder="Vorschaudaten auswaehlen" />
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshPreview()}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vorschau aktualisieren
              </Button>
              <Button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid gap-4 pt-12"
        style={{
          gridTemplateColumns: `${isFieldSidebarOpen ? '18rem' : '3.25rem'} minmax(0,1fr) ${isPreviewOpen ? '22rem' : '3.25rem'}`,
        }}
      >
        <div className="sticky top-48 h-[calc(100vh-13rem)] min-h-0">
          {isFieldSidebarOpen ? (
            <div className="relative h-full">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute top-3 right-3 z-10 h-8 w-8"
                onClick={() => setIsFieldSidebarOpen(false)}
                aria-label="Feldliste einklappen"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <PdfTemplateFieldSidebar
                fields={fields}
                onInsertField={handleInsertField}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center rounded-xl border bg-white p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsFieldSidebarOpen(true)}
                aria-label="Feldliste ausklappen"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="mt-3 flex flex-1 items-center justify-center"
                onClick={() => setIsFieldSidebarOpen(true)}
                aria-label="Verfuegbare Felder anzeigen"
              >
                <span className="rotate-180 text-[11px] font-medium tracking-[0.2em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                  Felder
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="mx-auto max-w-[980px] overflow-hidden rounded-lg border bg-white shadow-sm">
              <div
                ref={containerRef}
                className="h-[calc(100vh-13rem)] min-h-176 w-full"
              />
            </div>
          </div>
        </div>

        <div className="sticky top-48 h-[calc(100vh-13rem)] min-h-0">
          {isPreviewOpen ? (
            <div className="relative flex h-full min-h-0 flex-col rounded-xl border bg-white">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute top-3 right-3 z-10 h-8 w-8"
                onClick={() => setIsPreviewOpen(false)}
                aria-label="Vorschau einklappen"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
              <div className="border-b p-4 pr-14">
                <h2 className="text-sm font-semibold">Vorschau</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  Testdaten oder echter Einsatz rechts neben dem Designer.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden p-3">
                <PdfTemplatePreviewPanel
                  template={previewTemplate}
                  input={previewInput}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center rounded-xl border bg-white p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsPreviewOpen(true)}
                aria-label="Vorschau ausklappen"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="mt-3 flex flex-1 items-center justify-center"
                onClick={() => setIsPreviewOpen(true)}
                aria-label="Vorschau anzeigen"
              >
                <span className="text-[11px] font-medium tracking-[0.2em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                  Vorschau
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
