'use client';

import { toast } from 'sonner';
import { useEffect, useCallback, useState } from 'react';
import { addMonths, subMonths } from 'date-fns';

import { EventCalendar } from '@/components/event-calendar';
import { CalendarMode, CalendarEvent } from './types';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import {
  useDetailedEinsatz,
  useEinsaetzeForCalendar,
  usePrefetchEinsaetzeForCalendar,
} from '@/features/einsatz/hooks/useEinsatzQueries';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import {
  useCreateEinsatz,
  useUpdateEinsatz,
  useConfirmEinsatz,
  useToggleUserAssignment,
  useDeleteEinsatz,
  useDeleteMultipleEinsaetze,
} from '@/features/einsatz/hooks/useEinsatzMutations';
import { useUserPropertiesByOrg } from '@/features/user_properties/hooks/use-user-property-queries';
import { useUsersByOrgIds } from '@/features/user/hooks/use-user-queries';
import type {
  EinsatzCreate,
  EinsatzUserProperty,
} from '@/features/einsatz/types';
import { useEventDialogFromContext } from '@/contexts/EventDialogContext';
import type { UserPropertyWithField } from '@/features/user_properties/user_property-dal';

interface UserWithProperties {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string;
  user_organization_role: Array<{
    id: string;
    role: {
      id: string;
      name: string | null;
      abbreviation: string | null;
    };
  }>;
  user_property_value: Array<{
    id: string;
    user_property_id: string;
    value: string | null;
  }>;
}

interface ValidationResult {
  blocking: string[];
  warnings: string[];
}

interface ValidateUserAssignmentParams {
  requiredProperties: EinsatzUserProperty[];
  userProperties: UserPropertyWithField[];
  allUsers: UserWithProperties[];
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

    // If Input -1: Every assigned user must have this property
    let msg: string;
    let isViolation: boolean;

    if (minRequired === -1) {
      const totalAssigned = assignedAfterAdd.length;
      msg = `Eigenschaft "${propName}": ALLE Helfer müssen diese Eigenschaft haben (aktuell: ${matchingCount}/${totalAssigned})`;
      isViolation = matchingCount < totalAssigned;
    } else {
      msg = `Eigenschaft "${propName}": mindestens ${minRequired} Helfer benötigt (aktuell: ${matchingCount})`;
      isViolation = matchingCount < minRequired;
    }

    if (isViolation) {
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

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const { selectedEinsatz, setEinsatz } = useEventDialogFromContext();
  const currentEinsatzString =
    typeof selectedEinsatz === 'string' ? selectedEinsatz : undefined;
  const {
    data: calendarData,
    isError: isCalendarError,
    error: calendarError,
    isLoading: isCalendarLoading,
  } = useEinsaetzeForCalendar(activeOrgId, currentDate);
  const prefetchEinsaetzeForCalendar =
    usePrefetchEinsaetzeForCalendar(activeOrgId);
  const events = calendarData?.events;
  const detailedEinsaetze = calendarData?.detailedEinsaetze ?? [];
  const cachedDetailedEinsatz =
    typeof selectedEinsatz === 'string'
      ? detailedEinsaetze.find((e) => e.id === selectedEinsatz)
      : undefined;

  // Prefetch previous and next month so navigation to adjacent months is instant
  useEffect(() => {
    prefetchEinsaetzeForCalendar(subMonths(currentDate, 1));
    prefetchEinsaetzeForCalendar(addMonths(currentDate, 1));
  }, [currentDate, prefetchEinsaetzeForCalendar]);

  const {
    data: detailedEinsatz,
    error: detailedEinsatzError,
    isError: isDetailedEinsatzError,
  } = useDetailedEinsatz(cachedDetailedEinsatz ? null : currentEinsatzString);
  const effectiveDetailedEinsatz = cachedDetailedEinsatz ?? detailedEinsatz;
  const { data: organizations } = useOrganizations(session?.user.orgIds);
  const { data: userProperties } = useUserPropertiesByOrg(activeOrgId);
  const { data: orgUsers } = useUsersByOrgIds(activeOrgId ? [activeOrgId] : []);

  const { einsatz_singular, einsatz_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  // Stable callback for conflict cancellation
  const handleConflictCancel = useCallback(
    (einsatzId: string) => {
      setEinsatz(einsatzId);
    },
    [setEinsatz]
  );

  // Mutations with optimistic update
  const createMutation = useCreateEinsatz(
    activeOrgId,
    einsatz_singular,
    handleConflictCancel
  );
  const updateMutation = useUpdateEinsatz(
    activeOrgId,
    einsatz_singular,
    handleConflictCancel
  );
  const confirmMutation = useConfirmEinsatz(activeOrgId, einsatz_singular);
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

  const handleEventConfirm = (eventId: string) => {
    confirmMutation.mutate(eventId);
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
      if (!currentEinsatzString || !effectiveDetailedEinsatz) {
        throw new Error(`${einsatz_singular} konnte nicht geladen werden.`);
      }
      toggleUserAssignToEvent.mutate(currentEinsatzString);

      const requiredProperties = effectiveDetailedEinsatz.user_properties || [];

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
        helpersNeeded: effectiveDetailedEinsatz.helpers_needed ?? -1,
      });

      // Handle blocking errors
      /*       if (validationResult.blocking.length > 0) {
        await showDialog({
          title: 'Eintragung nicht möglich',
          description:
            'Die Eintragung würde die Anforderungen nicht erfüllen:\n\n' +
            validationResult.blocking.join('\n\n') +
            '\n\nBitte wenden Sie sich an die Einsatzleitung.',
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

  if (isCalendarError) {
    const msg =
      calendarError instanceof Error
        ? calendarError.message
        : 'Unbekannter Fehler';
    return <div>Fehler beim Laden der Einsätze: {msg}</div>;
  }

  const calendarEvents = calendarData?.events ?? [];
  return (
    <>
      {AlertDialogComponent}
      {createMutation.AlertDialogComponent}
      {updateMutation.AlertDialogComponent}
      <EventCalendar
        events={calendarEvents}
        isEventsLoading={isCalendarLoading}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        cachedDetailedEinsatz={cachedDetailedEinsatz}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onAssignToggleEvent={handleAssignToggleEvent}
        onEventTimeUpdate={handleEventTimeUpdate}
        onEventDelete={handleEventDelete}
        onEventConfirm={handleEventConfirm}
        onMultiEventDelete={handleMultiEventDelete}
        mode={mode}
        activeOrgId={activeOrgId}
      />
    </>
  );
}
