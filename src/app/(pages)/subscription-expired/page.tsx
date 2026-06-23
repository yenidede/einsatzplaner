import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getUserRolesInOrganization } from '@/DataAccessLayer/user';
import { getOrganizationAccessDecision } from '@/features/organization/organization-access';
import { getOrganizationAccessState } from '@/features/organization/org-dal';
import {
  EXPIRED_ORGANIZATION_CONTACT_EMAIL,
  getExpiredOrganizationSupportText,
  isHelperOnlyOrganizationRole,
} from '@/features/organization/subscription-expired';
import { authOptions } from '@/lib/auth.config';

export default async function SubscriptionExpiredPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
  }

  const activeOrganizationId = session.user.activeOrganization?.id;

  if (!activeOrganizationId) {
    redirect('/');
  }

  const activeOrganization =
    await getOrganizationAccessState(activeOrganizationId);

  if (!activeOrganization) {
    redirect('/');
  }

  const accessDecision = getOrganizationAccessDecision(activeOrganization);

  if (accessDecision.status !== 'expired') {
    redirect('/');
  }

  const activeOrganizationRoles = await getUserRolesInOrganization(
    session.user.id,
    activeOrganizationId
  );
  const isHelperOnly = isHelperOnlyOrganizationRole(
    activeOrganizationRoles.map((userRole) => userRole.role.name)
  );
  const supportText = getExpiredOrganizationSupportText(
    activeOrganizationRoles.map((userRole) => userRole.role.name)
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 md:px-6">
      <section className="bg-card w-full rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">
          Ihre aktive Organisation ist derzeit nicht verfügbar.
        </h1>
        <p className="text-muted-foreground mt-3">
          Der Zugriff auf {activeOrganization.name} ist abgelaufen.
        </p>
        {isHelperOnly ? (
          <p className="text-muted-foreground mt-3">{supportText}</p>
        ) : (
          <p className="text-muted-foreground mt-3">
            Bitte kontaktieren Sie Ihre Organisationsverwaltung oder schreiben
            Sie an{' '}
            <Link
              href={`mailto:${EXPIRED_ORGANIZATION_CONTACT_EMAIL}`}
              className="text-primary font-medium underline underline-offset-4"
            >
              {EXPIRED_ORGANIZATION_CONTACT_EMAIL}
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}
