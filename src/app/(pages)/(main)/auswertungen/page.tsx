import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getUserRolesInOrganization } from '@/DataAccessLayer/user';
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage';
import { authOptions } from '@/lib/auth.config';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';
import { hasAnalyticsAccessInOrgRoles } from '@/features/analytics/permissions';

export default async function AuswertungenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
  }

  const activeOrgId = session.user.activeOrganization?.id;

  if (!activeOrgId) {
    redirect('/');
  }

  const roles = await getUserRolesInOrganization(session.user.id, activeOrgId);

  if (!hasAnalyticsAccessInOrgRoles(roles)) {
    if (session.user.roleIds.includes(ROLE_NAME_MAP.Helfer)) {
      redirect('/helferansicht');
    }

    redirect('/');
  }

  return <AnalyticsPage />;
}
