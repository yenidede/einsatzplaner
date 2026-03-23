import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { TemplateList } from '@/components/pdfTemplates/TemplateList';

export default async function PdfTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.activeOrganization?.id) {
    return <div>Keine Berechtigung</div>;
  }

  //console.log('Session:', session); // Debug-Ausgabe der Session-Daten
  //console.log('Active Organization ID:', session.user.activeOrganization.id); // Debug-Ausgabe der aktiven Organisation
  const organizationId = session.user.activeOrganization?.id;
  //console.log('session.activeOrg', organizationId);

  const templates = await prisma.pdfTemplate.findMany({
    where: { organizationId },
    select: { id: true, name: true, isActive: true, documentType: true },
  });

  /* console.log(
    'templates found',
    templates.length,
    templates.map((t) => t.id)
  ); */

  return (
    <div className="container mx-auto p-4">
      <TemplateList
        organizationId={organizationId}
        templates={templates as any}
      />
    </div>
  );
}
