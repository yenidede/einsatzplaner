import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { notFound } from 'next/navigation';
import { PdfmeTemplateEditor } from '@/components/pdfTemplates/PdfmeTemplateEditor';
import { createDefaultPdfmeTemplate } from '@/features/pdf-templates/pdf-template-default';
import { getPdfPreviewAssignments } from '@/app/actions/pdfTemplates';
import { getPdfTemplateFieldDefinitions } from '@/features/pdf-templates/pdf-template-fields';

interface NewTemplatePageProps {
  searchParams?: Promise<{ orgId?: string }>;
}

export default async function NewTemplatePage({
  searchParams,
}: NewTemplatePageProps) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const organizationId =
    resolvedSearchParams?.orgId ?? session?.user?.activeOrganization?.id;

  if (!organizationId) {
    return <div>Keine Berechtigung</div>;
  }

  if (!session?.user?.orgIds?.includes(organizationId)) {
    notFound();
  }

  const [previewAssignments, fields] = await Promise.all([
    getPdfPreviewAssignments(organizationId),
    getPdfTemplateFieldDefinitions(organizationId),
  ]);

  return (
    <div className="w-full max-w-none px-3 pb-4 pt-10 sm:px-4 sm:pt-12 lg:px-6 xl:px-8">
      <PdfmeTemplateEditor
        organizationId={organizationId}
        initialName="Neue Buchungsbestätigung"
        initialTemplate={createDefaultPdfmeTemplate()}
        initialFooterConfig={null}
        initialSampleEinsatzId={null}
        previewAssignments={previewAssignments}
        fields={fields}
      />
    </div>
  );
}
