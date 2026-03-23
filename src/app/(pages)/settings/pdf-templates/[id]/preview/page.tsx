import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { TemplatePreview } from '@/components/pdfTemplates/TemplatePreview';
import { PdfTemplateContent } from '@/types/pdfTemplate';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewTemplatePage({
  params,
}: PreviewPageProps) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.activeOrganization?.id) {
    return <div>Keine Berechtigung</div>;
  }

  const template = await prisma.pdfTemplate.findFirst({
    where: {
      id: resolvedParams.id,
      organizationId: session.user.activeOrganization.id,
    },
  });

  if (!template) {
    return <div>Template nicht gefunden</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDF-Vorschau: {template.name}</h1>
        <Link href={`/settings/pdf-templates/${resolvedParams.id}/edit`}>
          <Button>Zurück zum Editor</Button>
        </Link>
      </div>
      <TemplatePreview content={template.contentJson as PdfTemplateContent} />
    </div>
  );
}
