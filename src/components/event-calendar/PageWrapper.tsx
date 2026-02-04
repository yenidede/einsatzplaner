'use client';

import Calendar from '@/components/event-calendar/calendar';
import { useSession } from 'next-auth/react';
import { CalendarMode } from './types';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useEinsaetze } from '@/features/einsatz/hooks/useEinsatzQueries';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function CalendarPageWrapper({
  mode,
  description,
}: {
  mode: CalendarMode;
  description?: string;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const orgIds = session?.user?.orgIds;

  const { data: organizations, isError: isOrgError } = useOrganizations(orgIds);

  const {
    isAuthorized,
    isLoading,
    session: permissionSession,
  } = usePermissionGuard(
    mode === 'verwaltung'
      ? {
          requiredPermissions: [
            'einsaetze:create',
            'einsaetze:update',
            'einsaetze:delete',
          ],
          requireAll: false,
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

  const activeOrgId = permissionSession?.user?.activeOrganization?.id;
  const activeOrg =
    organizations?.find((org) => org.id === activeOrgId) ?? null;

  const { isConnected } = useSupabaseRealtime(activeOrgId);

  const { einsatz_plural, helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  const { isError: isEventError } = useEinsaetze(activeOrgId);

  // Show loading state while session is being fetched
  if (sessionStatus === 'loading') {
    return <div>Lade Nutzerdaten...</div>;
  }

  const descriptionText = description
    ? description
    : mode === 'verwaltung'
      ? (activeOrg?.verwalteransicht_description ??
        `Hier können ${einsatz_plural} bearbeitet, erstellt und gelöscht werden..`)
      : (activeOrg?.helferansicht_description ??
        `Hier sehen Sie alle ${einsatz_plural}. Bitte tragen Sie sich für die Termine ein, an denen Sie verfügbar sind.`);

  if (isLoading) {
    return <div>Lade Berechtigungen...</div>;
  }
  if (!isAuthorized) {
    return <div>Keine Berechtigung. Weiterleitung...</div>;
  }
  if (isOrgError) {
    return <div>Fehler beim Laden der Organisationen</div>;
  }

  if (isEventError) {
    return <div>Fehler beim Laden der Einsätze.</div>;
  }

  return (
    <>
      <h1 className="leading-relaxed">
        {mode === 'verwaltung'
          ? `Verwaltungsansicht`
          : `${helper_plural}ansicht`}
      </h1>
      <p className="text-muted-foreground leading-6">{descriptionText}</p>
      <div className="mt-6">
        <Calendar mode={mode} />
      </div>
    </>
  );
}
