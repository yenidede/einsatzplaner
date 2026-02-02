'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirect legacy /vorlagen/[orgId]/[templateId] to /settings/vorlage/[templateId] */
export default function VorlagenEditRedirect() {
  const params = useParams();
  const router = useRouter();
  const templateId = params?.templateId as string;

  useEffect(() => {
    router.replace(`/settings/vorlage/${templateId}`);
  }, [router, templateId]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground text-sm">
      Weiterleitung…
    </div>
  );
}
