import { requireAuth } from '@/lib/auth/authGuard';
import { Suspense } from 'react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Lade Benutzerdaten ...</div>}>
      <ChildrenWrapper>{children}</ChildrenWrapper>
    </Suspense>
  );
}

async function ChildrenWrapper({ children }: { children: React.ReactNode }) {
  // This will automatically redirect to /signin if no session exists
  await requireAuth();

  return <>{children}</>;
}
