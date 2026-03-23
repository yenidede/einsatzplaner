import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { PdfTemplateBuilder } from '@/components/pdfTemplates/PdfTemplateBuilder';
import { PdfTemplateContent } from '@/types/pdfTemplate';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditPageProps) {
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

  const content = template.contentJson as PdfTemplateContent;

  return (
    <div className="container mx-auto p-4">
      <PdfTemplateBuilder
        templateId={resolvedParams.id}
        initialContent={content}
        initialName={template.name}
      />
    </div>
  );
}
