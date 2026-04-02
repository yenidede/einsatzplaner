import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPdfTemplatesByOrganization } from '@/app/actions/pdfTemplates';
import { PdfTemplateList } from '@/components/pdfTemplates/PdfTemplateList';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';

interface PdfTemplatesPageProps {
  searchParams?: Promise<{ orgId?: string }>;
}

export default async function PdfTemplatesPage({
  searchParams,
}: PdfTemplatesPageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeOrganization = session?.user?.activeOrganization;
  const requestedOrganizationId = resolvedSearchParams?.orgId;
  const hasAccessToRequestedOrganization = requestedOrganizationId
    ? session?.user?.orgIds?.includes(requestedOrganizationId) ||
      activeOrganization?.id === requestedOrganizationId
    : false;
  const organizationId =
    requestedOrganizationId && hasAccessToRequestedOrganization
      ? requestedOrganizationId
      : activeOrganization?.id;

  if (
    requestedOrganizationId &&
    !hasAccessToRequestedOrganization &&
    !activeOrganization?.id
  ) {
    return <div>Keine Berechtigung</div>;
  }

  if (!organizationId) {
    return <div>Keine Berechtigung</div>;
  }

  try {
    const templates = await getPdfTemplatesByOrganization(organizationId);

    return (
      <div className="container mx-auto p-4">
        <PdfTemplateList
          templates={templates}
          organizationId={organizationId}
          createHref={`/settings/pdf-templates/new?orgId=${organizationId}`}
        />
      </div>
    );
  } catch (error) {
    console.error(
      'Fehler beim Laden der PDF-Vorlagen für die Organisation:',
      organizationId,
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
