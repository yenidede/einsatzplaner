import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth.config';
import { DocumentTemplateEditor } from '@/components/document-template/DocumentTemplateEditor';
import {
  getDocumentTemplateById,
  getDocumentTemplateFields,
} from '@/features/document-template/server/document-template.actions';
import prisma from '@/lib/prisma';

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

  const [template, fields, organization] = await Promise.all([
    getDocumentTemplateById(templateId),
    getDocumentTemplateFields(orgId),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { einsatz_name_singular: true },
    }),
  ]);

  if (!template || template.organizationId !== orgId) {
    notFound();
  }

  return (
    <DocumentTemplateEditor
      organizationId={orgId}
      template={template}
      fields={fields}
      einsatzNameSingular={organization?.einsatz_name_singular ?? 'Einsatz'}
    />
  );
}
