"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { EventCalendar } from "@/components/event-calendar";
import { CalendarEvent, CalendarMode } from "./types";
import { EinsatzCreateToCalendarEvent } from "./einsatz-service";
import { EinsatzCreate } from "@/features/einsatz/types";
import {
  getEinsatzWithDetailsById,
  toggleUserAssignmentToEinsatz,
  updateEinsatzTime,
} from "@/features/einsatz/dal-einsatz";
import { getEinsaetzeData } from "./utils";
import {
  createEinsatz,
  deleteEinsatzById,
  updateEinsatz,
} from "@/features/einsatz/dal-einsatz";
import { toast } from "sonner";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { queryKeys as OrgaQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as StatusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { useSession } from "next-auth/react";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import { getAllUsersWithRolesByOrgId } from "@/features/user/user-dal";
import { getUserPropertiesByOrgId } from "@/features/user_properties/user_property-dal";
import { userPropertyQueryKeys } from "@/features/user_properties/queryKeys";
import { queryKeys as UserQueryKeys } from "@/features/user/queryKeys";

export default function Component({ mode }: { mode: CalendarMode }) {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.activeOrganization?.id;
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const queryClient = useQueryClient();
  const queryKey = einsatzQueryKeys.einsaetze(activeOrgId ? [activeOrgId] : []);

  const { data: events } = useQuery({
    queryKey: queryKey,
    queryFn: () => getEinsaetzeData(activeOrgId),
    enabled: !!activeOrgId,
  });

  const { data: organizations } = useQuery({
    queryKey: OrgaQueryKeys.organizations(session?.user.orgIds ?? []),
    queryFn: () => getOrganizationsByIds(session?.user.orgIds ?? []),
    enabled: !!session?.user.orgIds?.length,
  });

  const { data: statuses } = useQuery({
    queryKey: StatusQueryKeys.statuses(),
    queryFn: () => GetStatuses(),
  });

  const einsatz_singular =
    organizations?.find((org) => org.id === activeOrgId)
      ?.einsatz_name_singular ?? "Einsatz";
  const einsatz_plural =
    organizations?.find((org) => org.id === activeOrgId)?.einsatz_name_plural ??
    "Einsätze";

  // Mutations with optimistic update
  const createMutation = useMutation({
    mutationFn: async (event: EinsatzCreate) => {
      return createEinsatz({ data: event });
    },
    onMutate: async (event) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<CalendarEvent[]>(queryKey);

      const id = event.id ?? crypto.randomUUID();
      const optimisticVars: EinsatzCreate = { ...event, id };
      const calendarEvent = await EinsatzCreateToCalendarEvent(optimisticVars);

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) => [
        ...old,
        calendarEvent,
      ]);

      return { previous };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`
        ${einsatz_singular} konnte nicht erstellt werden: ${error}`);
    },
    onSuccess: (_data, vars) => {
      toast.success(einsatz_singular + " '" + vars.title + "' wurde erstellt.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (event: EinsatzCreate | CalendarEvent) => {
      // Check if is EinsatzCreate
      if ("org_id" in event) {
        return updateEinsatz({ data: event });
      } else {
        return updateEinsatzTime({
          id: event.id,
          start: event.start,
          end: event.end,
        });
      }
    },
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];

      let calendarEvent: CalendarEvent | null = null;
      if ("org_id" in updatedEvent) {
        calendarEvent = await EinsatzCreateToCalendarEvent(updatedEvent);
      } else {
        calendarEvent = updatedEvent;
      }

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.map((e) => (e.id === calendarEvent.id ? calendarEvent : e))
      );

      return { previous };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(
        `${einsatz_singular} konnte nicht aktualisiert werden: ${error}`
      );
    },
    onSuccess: (_data) => {
      toast.success(`${einsatz_singular} '${_data.title}' wurde aktualisiert.`);
    },
    onSettled: (data) => {
      // Invalidate the specific einsatz detail (only if we have a valid id)
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: einsatzQueryKeys.detailedEinsatz(data.id),
        });
      }
      // Keep the list in sync as well
      queryClient.invalidateQueries({
        queryKey: einsatzQueryKeys.allEinsaetze(),
      });
    },
  });

  const toggleUserAssignToEvent = useMutation({
    mutationFn: async (eventId: string) => {
      return await toggleUserAssignmentToEinsatz(eventId);
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) ?? [];

      const userId = session?.user.id;
      if (!userId) return { previous };

      const updated = previous.map((event) => {
        if (event.id !== eventId) return event;

        const isAssigned = event.assignedUsers.includes(userId);
        const newAssignedUsers = isAssigned
          ? event.assignedUsers.filter((id) => id !== userId)
          : [...event.assignedUsers, userId];

        // return a new object → important!
        return { ...event, assignedUsers: newAssignedUsers };
      });

      queryClient.setQueryData<CalendarEvent[]>(queryKey, updated);

      return { previous };
    },
    onError: (_error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatz_singular} konnte nicht aktualisiert werden`);
    },
    onSuccess: (data) => {
      // if helper was already assigned, the toggle returns with a property deleted = true
      if (!Object.hasOwn(data, "deleted"))
        toast.success(
          `Du hast dich erfolgreich bei '${data.title}' eingetragen`
        );
      else
        toast.success(`Du hast dich erfolgreich von ${data.title} ausgetragen`);
    },
    onSettled: (data) => {
      // Invalidate the specific einsatz detail (only if we have a valid id)
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: einsatzQueryKeys.detailedEinsatz(data.id),
        });
      }
      // Keep the list in sync as well
      queryClient.invalidateQueries({
        queryKey: einsatzQueryKeys.allEinsaetze(),
      });
    },
  });

  // Delete Mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async ({
      eventId,
    }: {
      eventId: string;
      eventTitle?: string;
    }) => {
      return deleteEinsatzById(eventId);
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];
      const toDelete = previous.find((e) => e.id === eventId);

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.filter((e) => e.id !== eventId)
      );

      return { previous, toDelete };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatz_singular} konnte nicht gelöscht werden: ${error}`);
    },
    onSuccess: (_data, vars, ctx) => {
      const title = ctx?.toDelete?.title || vars.eventTitle || "Unbenannt";
      toast.success(`${einsatz_singular} '${title}' wurde gelöscht.`);
    },
    onSettled: (_data, _error, variables) => {
      // Remove any cached detail for the deleted einsatz
      if (variables?.eventId) {
        queryClient.removeQueries({
          queryKey: einsatzQueryKeys.detailedEinsatz(variables.eventId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: einsatzQueryKeys.allEinsaetze(),
      });
    },
  });

  // Delete Mutation with optimistic update
  const deleteMultipleMutation = useMutation({
    mutationFn: async ({ eventIds }: { eventIds: string[] }) => {
      return deleteMultipleEinsaetze(eventIds);
    },
    onMutate: async ({ eventIds }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];
      const toDelete = previous.filter((e) => eventIds.includes(e.id));

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.filter((e) => !eventIds.includes(e.id))
      );

      return { previous, toDelete };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatz_singular} konnte nicht gelöscht werden: ${error}`);
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.eventIds.length + " " + einsatz_plural + " wurden gelöscht."
      );
    },
    onSettled: (_data, _error, variables) => {
      // Remove any cached detail for the deleted einsätze
      if (variables?.eventIds) {
        variables.eventIds.forEach((id) => {
          queryClient.removeQueries({
            queryKey: einsatzQueryKeys.detailedEinsatz(id),
          });
        });
      }
      queryClient.invalidateQueries({
        queryKey: einsatzQueryKeys.allEinsaetze(),
      });
    },
  });

  const handleEventAdd = (event: EinsatzCreate) => {
    createMutation.mutate(event);
  };

  const handleEventUpdate = (updatedEvent: EinsatzCreate | CalendarEvent) => {
    updateMutation.mutate(updatedEvent);
  };

  const handleAssignToggleEvent = async (eventId: string) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error("Benutzer nicht angemeldet");
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
        typeof einsatzDetail.helpers_needed === "number"
          ? einsatzDetail.helpers_needed
          : -1;

      const propMap = (props || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.field?.name ?? p.id;
        return acc;
      }, {} as Record<string, string>);

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
            if (String(upv.value).toLowerCase() === "true") return true;
            return String(upv.value).trim() !== "";
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
          title: "Eintragung nicht möglich",
          description:
            "Die Eintragung würde die Anforderungen nicht erfüllen:\n\n" +
            blocking.join("\n\n") +
            "\n\nBitte wende dich an die Einsatzleitung.",
          confirmText: "OK",
          variant: "destructive",
        });
        return;
      }

      if (warnings.length > 0) {
        const confirmed = await showDialog({
          title: "Warnung: Fehlende Eigenschaften",
          description: warnings.join("\n\n") + "\n\nTrotzdem eintragen?",
          confirmText: "Trotzdem eintragen",
          variant: "destructive",
        });

        if (confirmed !== "success") return;
      }

      toggleUserAssignToEvent.mutate(eventId);
    } catch (err) {
      toast.error("Fehler beim Überprüfen der Anforderungen");
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
    throw new Error("Function not implemented.");
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
