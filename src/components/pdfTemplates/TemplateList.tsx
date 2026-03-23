'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  deletePdfTemplate,
  updatePdfTemplate,
} from '@/app/actions/pdfTemplates';
import Link from 'next/link';

interface PdfTemplate {
  id: string;
  name: string;
  isActive: boolean;
  documentType: string;
}

interface TemplateListProps {
  organizationId: string;
  templates: PdfTemplate[];
}

export function TemplateList({ organizationId, templates }: TemplateListProps) {
  const [localTemplates, setLocalTemplates] = useState<PdfTemplate[]>(
    Array.isArray(templates) ? templates : []
  );

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updatePdfTemplate(id, { isActive });
    setLocalTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive } : t))
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm('Template löschen?')) {
      await deletePdfTemplate(id);
      setLocalTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">PDF-Templates</h2>
        <Link href={`/settings/pdf-templates/new`}>
          <Button>Neues Template</Button>
        </Link>
      </div>
      {localTemplates.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed border-slate-300 p-4 text-sm">
          Es sind noch keine PDF-Vorlagen angelegt. Bitte erstelle eine neue
          Vorlage.
        </div>
      )}

      {localTemplates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {template.name}
              <Switch
                checked={template.isActive}
                onCheckedChange={(checked) =>
                  handleToggleActive(template.id, checked)
                }
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Link href={`/settings/pdf-templates/${template.id}/edit`}>
                <Button variant="outline">Bearbeiten</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => handleDelete(template.id)}
              >
                Löschen
              </Button>
              <Link href={`/settings/pdf-templates/${template.id}/preview`}>
                <Button variant="outline">Vorschau</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
