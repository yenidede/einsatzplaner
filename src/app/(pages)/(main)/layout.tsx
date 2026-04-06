import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getOrganizationAccessDecision } from '@/features/organization/organization-access';
import { getOrganizationAccessState } from '@/features/organization/org-dal';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
  }

  const activeOrganizationId = session.user.activeOrganization?.id;

  if (activeOrganizationId) {
    const activeOrganization =
      await getOrganizationAccessState(activeOrganizationId);

    if (activeOrganization) {
      const accessDecision = getOrganizationAccessDecision(activeOrganization);

      if (accessDecision.status === 'expired') {
        redirect('/subscription-expired');
      }
    }
  }

  return <main className="px-4 py-8 pt-24 md:px-6">{children}</main>;
}
