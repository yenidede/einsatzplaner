import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { notFound } from 'next/navigation';
import {
  getPdfTemplateById,
  getPdfTemplatePreview,
} from '@/app/actions/pdfTemplates';
import { PdfTemplatePreviewPanel } from '@/components/pdfTemplates/PdfTemplatePreviewPanel';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ orgId?: string }>;
}

export default async function PreviewTemplatePage({
  params,
  searchParams,
}: PreviewPageProps) {
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

  const preview = await getPdfTemplatePreview(template.id, template.sampleEinsatzId);

  return (
    <div className="container mx-auto space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{template.name}</h1>
      <PdfTemplatePreviewPanel
        template={preview.template}
        input={preview.input}
      />
    </div>
  );
}
