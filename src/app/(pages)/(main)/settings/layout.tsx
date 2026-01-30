import { requireAuth } from '@/lib/auth/authGuard';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will automatically redirect to /signin if no session exists
  await requireAuth();

  return <>{children}</>;
}
