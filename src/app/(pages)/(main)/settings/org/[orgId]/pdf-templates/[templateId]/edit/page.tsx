import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { notFound } from 'next/navigation';
import { PdfTemplateEditor } from '@/features/pdf-template/components/editor/PdfTemplateEditor';
import { getPdfTemplateFieldDefinitions } from '@/features/pdf-template/lib/pdf-template-fields';
import {
  getPdfPreviewAssignments,
  getPdfTemplateById,
} from '@/features/pdf-template/server/pdf-template.actions';

interface EditPageProps {
  params: Promise<{ orgId: string; templateId: string }>;
}

export default async function EditTemplatePage({ params }: EditPageProps) {
  const { orgId, templateId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  const template = await getPdfTemplateById(templateId);

  if (!template || template.organizationId !== orgId) {
    notFound();
  }

  const [previewAssignments, fields] = await Promise.all([
    getPdfPreviewAssignments(orgId, template.sampleEinsatzId),
    getPdfTemplateFieldDefinitions(orgId),
  ]);

  return (
    <div className="-mb-8 flex h-[calc(100dvh-6rem)] min-h-0 w-full max-w-none overflow-hidden overscroll-none px-3 sm:px-4 lg:px-6 xl:px-8">
      <PdfTemplateEditor
        organizationId={orgId}
        templateId={template.id}
        initialName={template.name}
        initialTemplate={template.template}
        initialFooterConfig={template.footer}
        initialSampleEinsatzId={template.sampleEinsatzId}
        previewAssignments={previewAssignments}
        fields={fields}
      />
    </div>
  );
}
