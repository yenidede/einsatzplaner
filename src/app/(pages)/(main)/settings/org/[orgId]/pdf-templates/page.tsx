import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPdfTemplatesByOrganization } from '@/features/pdf-template/server/pdf-template.actions';
import { PdfTemplateList } from '@/features/pdf-template/components/list/PdfTemplateList';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';

interface PdfTemplatesPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PdfTemplatesPage({
  params,
}: PdfTemplatesPageProps) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    return <div>Keine Berechtigung</div>;
  }

  try {
    const templates = await getPdfTemplatesByOrganization(orgId);

    return (
      <div className="container mx-auto p-4">
        <PdfTemplateList templates={templates} organizationId={orgId} />
      </div>
    );
  } catch (error) {
    console.error(
      'Fehler beim Laden der PDF-Vorlagen für die Organisation:',
      orgId,
      error
    );

    return (
      <SettingsErrorCard
        title="Fehler beim Laden der PDF-Vorlagen"
        description="Die PDF-Vorlagen konnten nicht geladen werden. Bitte versuchen Sie es erneut."
        error={error instanceof Error ? error : null}
      />
    );
  }
}
