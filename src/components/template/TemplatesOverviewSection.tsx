'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useTemplates } from '@/features/template/hooks/use-template-queries';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TemplateCard } from '@/components/template/TemplateCard';

interface TemplatesOverviewSectionProps {
  orgId: string;
}

export function TemplatesOverviewSection({
  orgId,
}: TemplatesOverviewSectionProps) {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates(orgId);

  const handleCreate = () => {
    router.push(`/settings/vorlage/neu?orgId=${orgId}`);
  };

  const handleEdit = (templateId: string) => {
    router.push(`/settings/vorlage/${templateId}`);
  };

  const hasTemplates = templates && templates.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle id="vorlagen-heading">Vorlagen</CardTitle>
        <CardDescription>
          Übersicht aller Vorlagen für Einsätze. Klicke auf eine Vorlage zum
          Bearbeiten oder erstelle eine neue.
        </CardDescription>
        <CardAction>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Vorlage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Lade Vorlagen…
          </div>
        )}

        {!isLoading && !hasTemplates && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-center text-sm">
              Noch keine Vorlagen vorhanden. Erstelle deine erste Vorlage.
            </p>
            <div className="flex flex-col items-center justify-center">
              <Image
                src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
                alt="Illustration Vorlagen"
                width={245}
                height={210}
                unoptimized
              />
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Vorlage
            </Button>
          </div>
        )}

        {!isLoading && hasTemplates && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                icon={
                  template.template_icon?.icon_url?.trim() ? (
                    <Image
                      src={template.template_icon.icon_url.trim()}
                      alt={template.name ?? 'Unbenannte Vorlage'}
                      width={24}
                      height={24}
                      unoptimized
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-slate-200" />
                  )
                }
                title={template.name ?? 'Unbenannte Vorlage'}
                description={template.description}
                onClick={() => handleEdit(template.id)}
              />
            ))}
            <TemplateCard
              icon={<Plus className="text-muted-foreground" />}
              title="Neue Vorlage"
              description="Erstelle eine neue Vorlage"
              onClick={handleCreate}
              className="border-dashed opacity-70"
            />
            {/* <button
              type="button"
              onClick={handleCreate}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-6 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <Plus className="h-8 w-8 text-slate-400" />
              <span className="text-muted-foreground text-sm">
                Neues Template
              </span>
            </button> */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
