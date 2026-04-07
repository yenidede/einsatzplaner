import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getUserRolesInOrganization } from '@/DataAccessLayer/user';
import { TrialReminderBanner } from '@/components/organization/trial-reminder-banner';
import { authOptions } from '@/lib/auth.config';
import { getOrganizationAccessDecision } from '@/features/organization/organization-access';
import { getOrganizationAccessState } from '@/features/organization/org-dal';
import { getTrialReminderContent } from '@/features/organization/trial-reminder';

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
  let trialReminderMessage: string | null = null;

  if (activeOrganizationId) {
    const activeOrganization =
      await getOrganizationAccessState(activeOrganizationId);

    if (activeOrganization) {
      const accessDecision = getOrganizationAccessDecision(activeOrganization);

      if (accessDecision.status === 'expired') {
        redirect('/subscription-expired');
      }

      const activeOrganizationRoles = await getUserRolesInOrganization(
        session.user.id,
        activeOrganizationId
      );
      const trialReminder = getTrialReminderContent({
        accessDecision,
        trialEndsAt: activeOrganization.trial_ends_at,
        roleNames: activeOrganizationRoles.map((userRole) => userRole.role.name),
      });

      trialReminderMessage = trialReminder?.message ?? null;
    }
  }

  return (
    <main className="px-4 py-8 pt-24 md:px-6">
      {trialReminderMessage ? (
        <TrialReminderBanner message={trialReminderMessage} />
      ) : null}
      {children}
    </main>
  );
}
