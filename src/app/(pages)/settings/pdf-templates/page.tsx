import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPdfTemplatesByOrganization } from '@/app/actions/pdfTemplates';
import { PdfTemplateList } from '@/components/pdfTemplates/PdfTemplateList';

interface PdfTemplatesPageProps {
  searchParams?: Promise<{ orgId?: string }>;
}

export default async function PdfTemplatesPage({
  searchParams,
}: PdfTemplatesPageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const organizationId =
    resolvedSearchParams?.orgId ?? session?.user?.activeOrganization?.id;

  if (!organizationId) {
    return <div>Keine Berechtigung</div>;
  }

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
}
