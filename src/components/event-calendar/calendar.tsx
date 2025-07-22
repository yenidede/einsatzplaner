import React from "react";
import CalendarClient from "./calendar-client";
import { Suspense } from "react";
import { getAllEinsaetzeForCalendar } from "@/features/einsatz/dal-einsatz";
import type {
  EinsatzForCalendar,
  CalendarEvent,
} from "@/features/einsatz/types";
import { CalendarMode } from "./types";

const mapEinsaetzeToCalendarEvents = (
  einsaetze: EinsatzForCalendar[]
): CalendarEvent[] => {
  return einsaetze.map((einsatz) => {
    const categories = einsatz.einsatz_to_category;
    const hasCategories = categories && categories.length > 0;
    return {
      id: einsatz.id,
      title: hasCategories
        ? `${einsatz.title} (${categories
            .map((c) => c.einsatz_category.abbreviation)
            .join(", ")})`
        : einsatz.title,
      start: einsatz.start,
      end: einsatz.end,
      allDay: einsatz.all_day,
      status: einsatz.status,
      assignedUsers: einsatz.einsatz_helper.map((helper) => helper.user_id),
    };
  });
};

export default function Calendar({ mode }: { mode: CalendarMode }) {
  const getEinsaetzeData = async () => {
    const einsaetze = await getAllEinsaetzeForCalendar([
      "0c39989e-07bc-4074-92bc-aa274e5f22d0", //JMH for testing
    ]);
    return mapEinsaetzeToCalendarEvents(einsaetze);
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CalendarClient einsaetze={getEinsaetzeData()} mode={mode} />
    </Suspense>
  );
}
