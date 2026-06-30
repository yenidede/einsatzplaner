import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import EditorLayout from '@/features/pdf-template/components/editor/EditorLayout';
import { getPdfTemplateFieldDefinitions } from '@/features/pdf-template/lib/pdf-template-fields';
import {
  getPdfPreviewAssignments,
  getPdfTemplateById,
} from '@/features/pdf-template/server/pdf-template.actions';
import { authOptions } from '@/lib/auth.config';

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
    <div className="-mb-8 flex h-[calc(100dvh-6rem)] min-h-0 w-full max-w-none overflow-hidden overscroll-none px-2 sm:px-3 lg:px-4">
      <EditorLayout
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

