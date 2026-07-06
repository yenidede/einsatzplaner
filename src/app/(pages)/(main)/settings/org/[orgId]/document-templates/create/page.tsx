import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { DocumentTemplateEditor } from '@/components/document-template/DocumentTemplateEditor';
import { getDocumentTemplateFields } from '@/features/document-template/server/document-template.actions';

interface CreateDocumentTemplatePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function CreateDocumentTemplatePage({
  params,
}: CreateDocumentTemplatePageProps) {
  const { orgId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  const fields = await getDocumentTemplateFields(orgId);

  return (
    <DocumentTemplateEditor
      organizationId={orgId}
      fields={fields}
    />
  );
}
