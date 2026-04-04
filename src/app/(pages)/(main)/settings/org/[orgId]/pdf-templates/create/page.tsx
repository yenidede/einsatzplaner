import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import EditorLayout from '@/features/pdf-template/components/editor/EditorLayout';
import { createDefaultPdfmeTemplate } from '@/features/pdf-template/lib/pdf-template-defaults';
import { getPdfTemplateFieldDefinitions } from '@/features/pdf-template/lib/pdf-template-fields';
import { getPdfPreviewAssignments } from '@/features/pdf-template/server/pdf-template.actions';
import { authOptions } from '@/lib/auth.config';

interface NewTemplatePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function NewTemplatePage({
  params,
}: NewTemplatePageProps) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  const [previewAssignments, fields] = await Promise.all([
    getPdfPreviewAssignments(orgId),
    getPdfTemplateFieldDefinitions(orgId),
  ]);

  return (
    <div className="-mb-8 flex h-[calc(100dvh-6rem)] min-h-0 w-full max-w-none overflow-hidden overscroll-none px-2 sm:px-3 lg:px-4">
      <EditorLayout
        organizationId={orgId}
        initialName="Neue BuchungsbestÃ¤tigung"
        initialTemplate={createDefaultPdfmeTemplate()}
        initialFooterConfig={null}
        initialSampleEinsatzId={null}
        previewAssignments={previewAssignments}
        fields={fields}
      />
    </div>
  );
}

