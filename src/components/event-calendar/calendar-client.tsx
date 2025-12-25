"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { EventCalendar } from "@/components/event-calendar";
import { CalendarEvent, CalendarMode } from "./types";
import { EinsatzCreateToCalendarEvent } from "./einsatz-service";
import { EinsatzCreate } from "@/features/einsatz/types";
import {
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
import { useSession } from "next-auth/react";
import { getOrganizationsByIds } from "@/features/organization/org-dal";

export default function Component({ mode }: { mode: CalendarMode }) {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.activeOrganization?.id;

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

  const handleAssignToggleEvent = (eventId: string) => {
    toggleUserAssignToEvent.mutate(eventId);
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
  );
}
function deleteMultipleEinsaetze(eventIds: string[]): Promise<void> {
  try {
    throw new Error("Function not implemented.");
  } catch (error: unknown) {
    return Promise.reject(error);
  }
}
