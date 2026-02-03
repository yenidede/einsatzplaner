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
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface TemplatesOverviewSectionProps {
  orgId: string;
}

export function TemplatesOverviewSection({
  orgId,
}: TemplatesOverviewSectionProps) {
  const router = useRouter();
  const {
    data: templates,
    isLoading,
    isError,
    error,
    refetch,
  } = useTemplates(orgId);

  const { data: session } = useSession();
  const { data: organizations } = useOrganizations(session?.user?.orgIds);
  const { einsatz_plural } = useOrganizationTerminology(organizations, orgId);

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
          {`Vorlagen helfen, Standardwerte, eigene Felder und automatische Prüfungen festzulegen. Änderungen betreffen keine bestehenden ${einsatz_plural}.`}
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

        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-destructive text-center text-sm">
              {error?.message ??
                'Vorlagen konnten nicht geladen werden. Bitte versuchen Sie es erneut.'}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </div>
        )}

        {!isLoading && !isError && !hasTemplates && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-center text-sm">
              Noch keine Vorlagen vorhanden. Erstellen Sie Ihre erste Vorlage.
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

        {!isLoading && !isError && hasTemplates && (
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
                    <div className="h-6 w-6 rounded border-dashed border-red-200 bg-slate-200" />
                  )
                }
                title={
                  (template.name ?? 'Unbenannte Vorlage') +
                  (template.is_paused ? ' (pausiert)' : '')
                }
                description={template.description}
                onClick={() => handleEdit(template.id)}
                className={cn(
                  template.is_paused &&
                    'border-dashed border-red-200 bg-red-50 opacity-60 hover:border-red-300 hover:bg-red-100'
                )}
              />
            ))}
            <TemplateCard
              icon={<Plus className="text-muted-foreground" />}
              title="Neue Vorlage"
              description="Erstelle eine neue Vorlage"
              onClick={handleCreate}
              className="border-dashed opacity-70"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
