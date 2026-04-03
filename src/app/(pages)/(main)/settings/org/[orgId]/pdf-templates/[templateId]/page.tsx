import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { notFound } from 'next/navigation';
import { PdfTemplatePreview } from '@/features/pdf-template/components/editor/PdfTemplatePreview';
import {
  getPdfTemplateById,
  getPdfTemplatePreview,
} from '@/features/pdf-template/server/pdf-template.actions';

interface PreviewPageProps {
  params: Promise<{ orgId: string; templateId: string }>;
}

export default async function PreviewTemplatePage({
  params,
}: PreviewPageProps) {
  const { orgId, templateId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.orgIds?.includes(orgId)) {
    notFound();
  }

  const template = await getPdfTemplateById(templateId);

  if (!template || template.organizationId !== orgId) {
    notFound();
  }

  const preview = await getPdfTemplatePreview(
    template.id,
    template.sampleEinsatzId
  );

  return (
    <div className="container mx-auto space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{template.name}</h1>
      <PdfTemplatePreview template={preview.template} input={preview.input} />
    </div>
  );
}
