'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirect legacy /vorlagen/[orgId]/neu to /settings/vorlage/neu?orgId=... */
export default function VorlagenNeuRedirect() {
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string;

  useEffect(() => {
    router.replace(`/settings/vorlage/neu?orgId=${encodeURIComponent(orgId)}`);
  }, [router, orgId]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
      Weiterleitung…
    </div>
  );
}
