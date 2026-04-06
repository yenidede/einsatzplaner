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
        return (
          <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center px-4 py-8 pt-24 md:px-6">
            <section className="bg-card w-full rounded-2xl border p-8 shadow-sm">
              <h1 className="text-2xl font-semibold">
                Ihre aktive Organisation ist derzeit nicht verfuegbar.
              </h1>
              <p className="text-muted-foreground mt-3">
                Der Zugriff auf {activeOrganization.name} ist abgelaufen. Bitte
                wenden Sie sich an Ihre Organisationsverwaltung, um den Zugriff
                wieder freizuschalten.
              </p>
            </section>
          </main>
        );
      }
    }
  }

  return <main className="px-4 py-8 pt-24 md:px-6">{children}</main>;
}
