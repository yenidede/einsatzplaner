import { redirect } from 'next/navigation';

export default async function LegacyCreatePdfTemplatePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/settings/org/${orgId}/document-templates/create`);
}
