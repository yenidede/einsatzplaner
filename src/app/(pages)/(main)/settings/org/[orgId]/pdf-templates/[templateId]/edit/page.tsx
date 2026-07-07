import { redirect } from 'next/navigation';

export default async function LegacyEditPdfTemplatePage({
  params,
}: {
  params: Promise<{ orgId: string; templateId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/settings/org/${orgId}/document-templates`);
}
