'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { EventCalendar } from '@/components/event-calendar';
import { CalendarMode, CalendarEvent } from './types';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import { getAllUsersWithRolesByOrgId } from '@/features/user/user-dal';
import { getUserPropertiesByOrgId } from '@/features/user_properties/user_property-dal';
import { userPropertyQueryKeys } from '@/features/user_properties/queryKeys';
import { queryKeys as UserQueryKeys } from '@/features/user/queryKeys';
import { useEinsaetze } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import {
  useCreateEinsatz,
  useUpdateEinsatz,
  useToggleUserAssignment,
  useDeleteEinsatz,
  useDeleteMultipleEinsaetze,
} from '@/features/einsatz/hooks/useEinsatzMutations';
import { queryKeys as einsatzQueryKeys } from '@/features/einsatz/queryKeys';
import type { EinsatzCreate } from '@/features/einsatz/types';

export default function Component({ mode }: { mode: CalendarMode }) {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.activeOrganization?.id;
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const queryClient = useQueryClient();

  const { data: events } = useEinsaetze(activeOrgId);
  const { data: organizations } = useOrganizations(session?.user.orgIds);

  const { einsatz_singular, einsatz_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  // Mutations with optimistic update
  const createMutation = useCreateEinsatz(activeOrgId, einsatz_singular);
  const updateMutation = useUpdateEinsatz(activeOrgId, einsatz_singular);
  const toggleUserAssignToEvent = useToggleUserAssignment(
    activeOrgId,
    session?.user.id,
    einsatz_singular
  );
  const deleteMutation = useDeleteEinsatz(activeOrgId, einsatz_singular);
  const deleteMultipleMutation = useDeleteMultipleEinsaetze(
    activeOrgId,
    einsatz_singular,
    einsatz_plural
  );

  const handleEventAdd = (event: EinsatzCreate) => {
    createMutation.mutate(event);
  };

  const handleEventUpdate = (updatedEvent: EinsatzCreate | CalendarEvent) => {
    updateMutation.mutate(updatedEvent);
  };

  const handleAssignToggleEvent = async (eventId: string) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Benutzer nicht angemeldet');
      return;
    }

    const event = Array.isArray(events)
      ? events.find((e) => e.id === eventId)
      : undefined;
    const isCurrentlyAssigned = !!event?.assignedUsers?.includes(userId);

    if (isCurrentlyAssigned) {
      toggleUserAssignToEvent.mutate(eventId);
      return;
    }

    try {
      // 1) Try to read cached data first (fast)
      const cachedDetail = queryClient.getQueryData(
        einsatzQueryKeys.detailedEinsatz(eventId)
      ) as any | undefined;

      const cachedProps =
        activeOrgId &&
        queryClient.getQueryData(userPropertyQueryKeys.byOrg(activeOrgId))
          ? (queryClient.getQueryData(
              userPropertyQueryKeys.byOrg(activeOrgId)
            ) as any[])
          : undefined;

      const cachedUsers =
        activeOrgId && queryClient.getQueryData(UserQueryKeys.user(activeOrgId))
          ? (queryClient.getQueryData(UserQueryKeys.user(activeOrgId)) as any[])
          : undefined;

      let einsatzDetail = cachedDetail;
      let props = cachedProps;
      let allUsers = cachedUsers;

      // 2) Only fetch missing pieces (in parallel)
      const fetchPromises: Promise<any>[] = [];
      if (!einsatzDetail)
        fetchPromises.push(getEinsatzWithDetailsById(eventId));
      if (!props && activeOrgId)
        fetchPromises.push(getUserPropertiesByOrgId(activeOrgId));
      if (!allUsers && activeOrgId)
        fetchPromises.push(getAllUsersWithRolesByOrgId(activeOrgId));

      if (fetchPromises.length > 0) {
        const results = await Promise.all(fetchPromises);
        let i = 0;
        if (!einsatzDetail) einsatzDetail = results[i++];
        if (!props && activeOrgId) props = results[i++];
        if (!allUsers && activeOrgId) allUsers = results[i++];
      }

      if (!einsatzDetail || einsatzDetail instanceof Response) {
        toggleUserAssignToEvent.mutate(eventId);
        return;
      }

      const reqProps = einsatzDetail.einsatz_user_property || [];
      if (reqProps.length === 0) {
        toggleUserAssignToEvent.mutate(eventId);
        return;
      }

      const helpersNeeded =
        typeof einsatzDetail.helpers_needed === 'number'
          ? einsatzDetail.helpers_needed
          : -1;

      const propMap = (props || []).reduce(
        (acc: any, p: any) => {
          acc[p.id] = p.field?.name ?? p.id;
          return acc;
        },
        {} as Record<string, string>
      );

      const propTypeMap = (props || []).reduce(
        (acc: any, p: any) => {
          acc[p.id] = p.field?.type?.datatype ?? null;
          return acc;
        },
        {} as Record<string, string | null>
      );

      const assignedAfterAdd = Array.from(
        new Set([...(event?.assignedUsers || []), userId])
      );

      const blocking: string[] = [];
      const warnings: string[] = [];

      for (const req of reqProps) {
        if (!req.is_required) continue;
        const minRequired = req.min_matching_users ?? 1;
        const propId = req.user_property_id;

        const matchingCount = (allUsers || [])
          .filter((u: any) => assignedAfterAdd.includes(u.id))
          .filter((u: any) => {
            const upv = (u.user_property_value || []).find(
              (v: any) => v.user_property_id === propId
            );
            if (!upv || upv.value == null) return false;

            const datatype = propTypeMap[propId];

            if (datatype === 'boolean') {
              const val = String(upv.value).toLowerCase().trim();
              return val === 'true' || val === '1';
            }

            return String(upv.value).trim() !== '';
          }).length;

        const propName = propMap[propId] ?? propId;

        const slotsFilledAfterAdd =
          helpersNeeded >= 0 ? assignedAfterAdd.length >= helpersNeeded : false;

        const msg = `Eigenschaft "${propName}": mindestens ${minRequired} Helfer benötigt (aktuell: ${matchingCount})`;

        if (matchingCount < minRequired) {
          if (slotsFilledAfterAdd) {
            blocking.push(msg);
          } else {
            warnings.push(msg);
          }
        }
      }

      if (blocking.length > 0) {
        await showDialog({
          title: 'Eintragung nicht möglich',
          description:
            'Die Eintragung würde die Anforderungen nicht erfüllen:\n\n' +
            blocking.join('\n\n') +
            '\n\nBitte wende dich an die Einsatzleitung.',
          confirmText: 'OK',
          variant: 'destructive',
        });
        return;
      }

      if (warnings.length > 0) {
        const confirmed = await showDialog({
          title: 'Warnung: Fehlende Eigenschaften',
          description: warnings.join('\n\n') + '\n\nTrotzdem eintragen?',
          confirmText: 'Trotzdem eintragen',
          variant: 'destructive',
        });

        if (confirmed !== 'success') return;
      }

      toggleUserAssignToEvent.mutate(eventId);
    } catch (err) {
      toast.error('Fehler beim Überprüfen der Anforderungen. ' + err);
      toggleUserAssignToEvent.mutate(eventId);
    }
  };

  const handleEventTimeUpdate = (event: CalendarEvent) => {
    updateMutation.mutate(event);
  };

  const handleEventDelete = (eventId: string, eventTitle: string) => {
    deleteMutation.mutate({ eventId, eventTitle });
  };

  const handleMultiEventDelete = (eventIds: string[]) => {
    deleteMultipleMutation.mutate({ eventIds });
  };

  if (!events) {
    return <div>Lade Daten...</div>;
  }

  return (
    <>
      {AlertDialogComponent}
      <EventCalendar
        events={events as CalendarEvent[]}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onAssignToggleEvent={handleAssignToggleEvent}
        onEventTimeUpdate={handleEventTimeUpdate}
        onEventDelete={handleEventDelete}
        onMultiEventDelete={handleMultiEventDelete}
        mode={mode}
        activeOrgId={activeOrgId}
      />
    </>
  );
}
function deleteMultipleEinsaetze(eventIds: string[]): Promise<void> {
  try {
    throw new Error('Function not implemented.');
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
