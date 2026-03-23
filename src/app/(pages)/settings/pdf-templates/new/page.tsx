import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { createPdfTemplate } from '@/app/actions/pdfTemplates';
import { redirect } from 'next/navigation';

export default async function NewTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.activeOrganization?.id) {
    return <div>Keine Berechtigung</div>;
  }

  // Standardvorlage
  const defaultContent: PdfTemplateContent = {
    blocks: [
      {
        id: 'header-text',
        type: 'text' as const,
        data: {
          content: 'Buchungsbestätigung für {{assignment.groupName}}',
        },
      },
      {
        id: 'info-table',
        type: 'infoTable' as const,
        data: {
          rows: [
            { label: 'Datum', value: '{{assignment.formattedDate}}' },
            { label: 'Uhrzeit', value: '{{assignment.formattedTimeRange}}' },
            { label: 'Teilnehmer', value: '{{assignment.participantSummary}}' },
            { label: 'Kosten', value: '{{assignment.priceSummary}}' },
          ],
        },
      },
      {
        id: 'spacer-1',
        type: 'spacer' as const,
        data: { height: 10 },
      },
      {
        id: 'signature',
        type: 'signature' as const,
        data: {
          text: 'Mit freundlichen Grüßen\n{{organization.signatureName}}\n{{organization.signatureRole}}',
        },
      },
      {
        id: 'preset-notice',
        type: 'presetNotice' as const,
        data: {
          notice: 'Bitte pünktlich erscheinen und Ausweis mitbringen.',
        },
      },
    ],
  };

  return (
    <form
      action={async (formData: FormData) => {
        'use server';
        const name = formData.get('name') as string;
        await createPdfTemplate({
          organizationId: session.user.activeOrganization.id,
          name,
          contentJson: defaultContent,
        });
        redirect('/settings/pdf-templates');
      }}
      className="container mx-auto p-4"
    >
      <h2 className="mb-4 text-xl font-bold">Neues PDF-Template</h2>
      <input
        name="name"
        type="text"
        placeholder="Template-Name"
        className="mb-4 w-full border p-2"
        required
      />
      <button type="submit" className="bg-blue-500 px-4 py-2 text-white">
        Erstellen
      </button>
    </form>
  );
}
