'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirect legacy /vorlagen/[orgId]/[templateId] to /settings/vorlage/[templateId] */
export default function VorlagenEditRedirect() {
  const params = useParams();
  const router = useRouter();
  // as is valid here as it is checked again in the actual page
  const templateId = params?.templateId as string;

  useEffect(() => {
    router.replace(`/settings/vorlage/${templateId}`);
  }, [router, templateId]);

  return (
    <div className="text-muted-foreground flex min-h-[200px] items-center justify-center text-sm">
      Weiterleitung…
    </div>
  );
}
