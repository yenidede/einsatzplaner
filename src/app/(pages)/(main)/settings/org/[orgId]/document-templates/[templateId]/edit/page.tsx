import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { DocumentTemplateEditor } from '@/components/document-template/DocumentTemplateEditor';
import {
  getDocumentTemplateById,
  getDocumentTemplateFields,
} from '@/features/document-template/server/document-template.actions';

interface EditDocumentTemplatePageProps {
  params: Promise<{ orgId: string; templateId: string }>;
}

export default async function EditDocumentTemplatePage({
  params,
}: EditDocumentTemplatePageProps) {
  const { orgId, templateId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  const [template, fields] = await Promise.all([
    getDocumentTemplateById(templateId),
    getDocumentTemplateFields(orgId),
  ]);

  if (!template || template.organizationId !== orgId) {
    notFound();
  }

  return (
    <DocumentTemplateEditor
      organizationId={orgId}
      template={template}
      fields={fields}
    />
  );
}
