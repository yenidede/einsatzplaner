import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { getDocumentTemplatesByOrganization } from '@/features/document-template/server/document-template.actions';
import { DocumentTemplateList } from '@/components/document-template/DocumentTemplateList';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';

interface DocumentTemplatesPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function DocumentTemplatesPage({
  params,
}: DocumentTemplatesPageProps) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  try {
    const templates = await getDocumentTemplatesByOrganization(orgId);
    return (
      <div className="container mx-auto p-4">
        <DocumentTemplateList organizationId={orgId} templates={templates} />
      </div>
    );
  } catch (error) {
    return (
      <SettingsErrorCard
        title="Fehler beim Laden der Dokumentvorlagen"
        description="Die Dokumentvorlagen konnten nicht geladen werden. Bitte versuchen Sie es erneut."
        error={error instanceof Error ? error : null}
      />
    );
  }
}
