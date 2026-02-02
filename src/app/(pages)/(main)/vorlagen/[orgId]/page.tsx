'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redirect /vorlagen/[orgId] to organization settings templates section.
 * The templates overview is integrated into settings/org/[orgId].
 */
export default function VorlagenOverviewRedirect() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string;

  useEffect(() => {
    router.replace(`/settings/org/${orgId}#vorlagen`);
  }, [router, orgId]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
      Weiterleitung…
    </div>
  );
}
