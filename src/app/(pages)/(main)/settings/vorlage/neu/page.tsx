'use client';

import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TemplateForm } from '@/components/template/TemplateForm';

export default function NewTemplatePage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const orgIdFromQuery = searchParams.get('orgId');
  const activeOrgId = session?.user?.activeOrganization?.id;
  const orgId = orgIdFromQuery ?? activeOrgId ?? '';

  if (!orgId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-sm">
          Bitte wählen Sie eine Organisation aus oder öffnen Sie diese Seite über die
          Einstellungen einer Organisation.
        </p>
      </div>
    );
  }

  return (
    <TemplateForm orgId={orgId} backHref={`/settings/org/${orgId}#vorlagen`} />
  );
}
