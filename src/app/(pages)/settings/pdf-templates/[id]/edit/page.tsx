import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { notFound } from 'next/navigation';
import { getPdfTemplateById, getPdfPreviewAssignments } from '@/app/actions/pdfTemplates';
import { PdfmeTemplateEditor } from '@/components/pdfTemplates/PdfmeTemplateEditor';
import { getPdfTemplateFieldDefinitions } from '@/features/pdf-templates/pdf-template-fields';

interface EditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ orgId?: string }>;
}

export default async function EditTemplatePage({
  params,
  searchParams,
}: EditPageProps) {
  const { id } = await params;
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

  const template = await getPdfTemplateById(id);

  if (!template || template.organizationId !== organizationId) {
    notFound();
  }

  const [previewAssignments, fields] = await Promise.all([
    getPdfPreviewAssignments(organizationId),
    getPdfTemplateFieldDefinitions(organizationId),
  ]);

  return (
    <div className="container mx-auto p-4">
      <PdfmeTemplateEditor
        organizationId={organizationId}
        templateId={template.id}
        initialName={template.name}
        initialTemplate={template.template}
        initialSampleEinsatzId={template.sampleEinsatzId}
        previewAssignments={previewAssignments}
        fields={fields}
      />
    </div>
  );
}
