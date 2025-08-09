"use client";

import { use, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  EventCalendar,
  mapEinsaetzeToCalendarEvents,
} from "@/components/event-calendar";
import { CalendarEvent, CalendarMode } from "./types";
import { EinsatzCreateToCalendarEvent } from "./einsatz-service";
import { EinsatzCreate } from "@/features/einsatz/types";
import { getAllEinsaetzeForCalendar } from "@/features/einsatz/dal-einsatz";
import {
  createEinsatz,
  deleteEinsatzById,
  updateEinsatz,
} from "@/features/einsatz/dal-einsatz";
import { toast } from "sonner";

export default function Component({
  einsaetzeProp,
  mode,
}: {
  einsaetzeProp: Promise<CalendarEvent[]>;
  mode: CalendarMode;
}) {
  const orgs = ["0c39989e-07bc-4074-92bc-aa274e5f22d0"]; // TODO: remove - JMH for testing
  const queryClient = useQueryClient();
  const queryKey = ["einsaetze", orgs];

  async function getEinsaetzeData() {
    return mapEinsaetzeToCalendarEvents(await getAllEinsaetzeForCalendar(orgs));
  }

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ["einsaetze", orgs],
    queryFn: getEinsaetzeData,
    initialData: use(einsaetzeProp),
  });

  // Create Mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: async (event: EinsatzCreate) => {
      return createEinsatz({ data: event });
    },
    onMutate: async (event) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];

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
      toast.error("Fehler beim Erstellen des Einsatzes: " + error);
    },
    onSuccess: (_result, vars) => {
      toast.success("Einsatz '" + vars.title + "' wurde erstellt.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (event: EinsatzCreate) => {
      return updateEinsatz({ data: event });
    },
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];
      const calendarEvent = await EinsatzCreateToCalendarEvent(updatedEvent);

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.map((e) => (e.id === calendarEvent.id ? calendarEvent : e))
      );

      return { previous };
    },
    onError: (error, vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error("Fehler beim Aktualisieren des Einsatzes: " + error);
      console.error("Error updating Einsatz:", error);
    },
    onSuccess: (_result, vars) => {
      toast.success("Einsatz '" + vars.title + "' wurde aktualisiert.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
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
      toast.error("Fehler beim Löschen des Einsatzes: " + error);
      console.error("Error deleting Einsatz:", error);
    },
    onSuccess: (_result, vars, ctx) => {
      const title = ctx?.toDelete?.title || vars.eventTitle || "Unbenannt";
      toast.success("Einsatz '" + title + "' wurde gelöscht.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleEventAdd = async (event: EinsatzCreate) => {
    createMutation.mutate(event);
  };

  const handleEventUpdate = async (updatedEvent: EinsatzCreate) => {
    updateMutation.mutate(updatedEvent);
  };

  const handleEventDelete = async (eventId: string, eventTitle: string) => {
    deleteMutation.mutate({ eventId, eventTitle });
  };

  return (
    <EventCalendar
      events={events}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
      mode={mode}
    />
  );
}
