'use client';

import { toast } from 'sonner';
import { useEffect } from 'react';

import { EventCalendar } from '@/components/event-calendar';
import { CalendarMode, CalendarEvent } from './types';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import {
  useDetailedEinsatz,
  useEinsaetze,
} from '@/features/einsatz/hooks/useEinsatzQueries';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import {
  useCreateEinsatz,
  useUpdateEinsatz,
  useToggleUserAssignment,
  useDeleteEinsatz,
  useDeleteMultipleEinsaetze,
} from '@/features/einsatz/hooks/useEinsatzMutations';
import { useUserPropertiesByOrg } from '@/features/user_properties/hooks/use-user-property-queries';
import { useUsersByOrgIds } from '@/features/user/hooks/use-user-queries';
import type { EinsatzCreate } from '@/features/einsatz/types';
import { useEventDialogFromContext } from '@/contexts/EventDialogContext';

interface ValidationResult {
  blocking: string[];
  warnings: string[];
}

interface ValidateUserAssignmentParams {
  requiredProperties: any[];
  userProperties: any[];
  allUsers: any[];
  currentAssignedUsers: string[];
  userIdToAdd: string;
  helpersNeeded: number;
}

function validateUserAssignment({
  requiredProperties,
  userProperties,
  allUsers,
  currentAssignedUsers,
  userIdToAdd,
  helpersNeeded,
}: ValidateUserAssignmentParams): ValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  // Build property name and type maps
  const propMap = userProperties.reduce(
    (acc, prop) => {
      acc[prop.id] = prop.field?.name ?? prop.id;
      return acc;
    },
    {} as Record<string, string>
  );

  const propTypeMap = userProperties.reduce(
    (acc, prop) => {
      acc[prop.id] = prop.field?.type?.datatype ?? null;
      return acc;
    },
    {} as Record<string, string | null>
  );

  // Simulate assigned users after adding this user
  const assignedAfterAdd = Array.from(
    new Set([...currentAssignedUsers, userIdToAdd])
  );

  const slotsFilledAfterAdd =
    helpersNeeded >= 0 && assignedAfterAdd.length >= helpersNeeded;

  // Check each required property
  for (const requirement of requiredProperties) {
    if (!requirement.is_required) continue;

    const minRequired = requirement.min_matching_users ?? 1;
    const propId = requirement.user_property_id;
    const propName = propMap[propId] ?? propId;
    const datatype = propTypeMap[propId];

    // Count how many assigned users match this requirement
    const matchingCount = allUsers
      .filter((user) => assignedAfterAdd.includes(user.id))
      .filter((user) => {
        const propertyValue = user.user_property_value?.find(
          (v: any) => v.user_property_id === propId
        );

        if (!propertyValue?.value) return false;

        // Handle boolean type specially
        if (datatype === 'boolean') {
          const val = String(propertyValue.value).toLowerCase().trim();
          return val === 'true' || val === '1';
        }

        // For other types, check if value is non-empty
        return String(propertyValue.value).trim() !== '';
      }).length;

    const msg = `Eigenschaft "${propName}": mindestens ${minRequired} Helfer benötigt (aktuell: ${matchingCount})`;

    if (matchingCount < minRequired) {
      // If slots are filled, this is a blocking error
      // Otherwise, it's just a warning
      if (slotsFilledAfterAdd) {
        blocking.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  return { blocking, warnings };
}

export default function Component({ mode }: { mode: CalendarMode }) {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.activeOrganization?.id;
  const userId = session?.user?.id;
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const { selectedEinsatz, setEinsatz } = useEventDialogFromContext();
  const currentEinsatzString =
    typeof selectedEinsatz === 'string' ? selectedEinsatz : undefined;
  const {
    data: detailedEinsatz,
    error: detailedEinsatzError,
    isError: isDetailedEinsatzError,
  } = useDetailedEinsatz(currentEinsatzString);

  const { data: events } = useEinsaetze(activeOrgId);
  const { data: organizations } = useOrganizations(session?.user.orgIds);
  const { data: userProperties } = useUserPropertiesByOrg(activeOrgId);
  const { data: orgUsers } = useUsersByOrgIds(activeOrgId ? [activeOrgId] : []);

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

  // Handle invalid einsatz ID
  useEffect(() => {
    if (isDetailedEinsatzError && currentEinsatzString) {
      const errorMessage =
        detailedEinsatzError instanceof Error
          ? detailedEinsatzError.message
          : '';
      toast.error(
        `${einsatz_singular} konnte nicht geladen werden: ${errorMessage}`,
        {
          duration: 10000, // should stay longer to avoid confusion
        }
      );
      setEinsatz(null);
    }
  }, [
    isDetailedEinsatzError,
    detailedEinsatzError,
    currentEinsatzString,
    setEinsatz,
    einsatz_singular,
  ]);

  const handleEventAdd = (event: EinsatzCreate) => {
    createMutation.mutate(event);
  };

  const handleEventUpdate = (updatedEvent: EinsatzCreate | CalendarEvent) => {
    updateMutation.mutate(updatedEvent);
  };

  const handleAssignToggleEvent = async (eventId: string) => {
    if (!userId) {
      toast.error('Benutzer nicht angemeldet');
      return;
    }

    const event = Array.isArray(events)
      ? events.find((e) => e.id === eventId)
      : undefined;

    if (!event) {
      toast.error('Einsatz nicht gefunden');
      return;
    }

    const isCurrentlyAssigned = event.assignedUsers?.includes(userId) ?? false;

    // If user is removing themselves, no validation needed
    if (isCurrentlyAssigned) {
      toggleUserAssignToEvent.mutate(eventId);
      return;
    }

    try {
      if (!currentEinsatzString || !detailedEinsatz) {
        throw new Error(`${einsatz_singular} konnte nicht geladen werden.`);
      }
      toggleUserAssignToEvent.mutate(currentEinsatzString);

      const requiredProperties = detailedEinsatz.user_properties || [];

      // No requirements? Proceed without validation
      if (requiredProperties.length === 0) {
        toggleUserAssignToEvent.mutate(eventId);
        return;
      }

      // Validate requirements
      const validationResult = validateUserAssignment({
        requiredProperties,
        userProperties: userProperties || [],
        allUsers: orgUsers || [],
        currentAssignedUsers: event.assignedUsers || [],
        userIdToAdd: userId,
        helpersNeeded: detailedEinsatz.helpers_needed ?? -1,
      });

      // Handle blocking errors
      /*       if (validationResult.blocking.length > 0) {
        await showDialog({
          title: 'Eintragung nicht möglich',
          description:
            'Die Eintragung würde die Anforderungen nicht erfüllen:\n\n' +
            validationResult.blocking.join('\n\n') +
            '\n\nBitte wende dich an die Einsatzleitung.',
          confirmText: 'OK',
          variant: 'destructive',
        });
        return;
      } */

      // Handle warnings
      if (validationResult.warnings.length > 0) {
        const confirmed = await showDialog({
          title: 'Warnung: Fehlende Eigenschaften',
          description:
            validationResult.warnings.join('\n\n') + '\n\nTrotzdem eintragen?',
          confirmText: 'Trotzdem eintragen',
          variant: 'destructive',
        });

        if (confirmed !== 'success') return;
      }

      toggleUserAssignToEvent.mutate(eventId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Überprüfen der Anforderungen: ' + errorMessage);
      console.error('Assignment validation error:', err);
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
