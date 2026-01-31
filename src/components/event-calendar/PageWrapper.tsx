'use client';

import Calendar from '@/components/event-calendar/calendar';
import { CalendarMode } from './types';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useEinsaetze } from '@/features/einsatz/hooks/useEinsatzQueries';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';

export default function CalendarPageWrapper({
  mode,
  description,
}: {
  mode: CalendarMode;
  description?: string;
}) {
  const { isAuthorized, isLoading, session } = usePermissionGuard(
    mode === 'verwaltung'
      ? {
          requiredPermissions: [
            'einsaetze:create',
            'einsaetze:update',
            'einsaetze:delete',
          ],
          requireAll: false, // User needs at least one of these
          customRedirect: (roleIds) => {
            if (roleIds.includes(ROLE_NAME_MAP['Helfer'])) {
              return '/helferansicht';
            }
            return '/';
          },
        }
      : {
          requiredPermissions: ['einsaetze:read'],
        }
  );

  const orgIds = session?.user?.orgIds;

  const { data: organizations, isError: isOrgError } = useOrganizations(orgIds);

  const activeOrgId = session?.user?.activeOrganization?.id;
  const activeOrg =
    organizations?.find((org) => org.id === activeOrgId) ?? null;

  const { einsatz_plural, helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  const { isError: isEventError } = useEinsaetze(activeOrgId);

  // Show loading state while authorization is being checked
  if (isLoading) {
    return <div>Lade Nutzerdaten...</div>;
  }

  // If not authorized, show loading message while redirect happens
  if (!isAuthorized) {
    return <div>Keine Berechtigung. Weiterleitung...</div>;
  }

  const descriptionText = description
    ? description
    : mode === 'verwaltung'
      ? (activeOrg?.verwalteransicht_description ??
        `Hier können ${einsatz_plural} bearbeitet, erstellt und gelöscht werden..`)
      : (activeOrg?.helferansicht_description ??
        `Hier sehen Sie alle ${einsatz_plural}. Bitte tragen Sie sich für die Termine ein, an denen Sie verfügbar sind.`);

  if (isOrgError) {
    return <div>Fehler beim Laden der Organisationen</div>;
  }

  if (isEventError) {
    return <div>Fehler beim Laden der Einsätze.</div>;
  }

  return (
    <>
      <h1>
        {mode === 'verwaltung'
          ? `Verwaltungsansicht`
          : `${helper_plural}ansicht`}
      </h1>
      <p className="text-muted-foreground leading-4">{descriptionText}</p>
      <div className="mt-6">
        <Calendar mode={mode} />
      </div>
    </>
  );
}
