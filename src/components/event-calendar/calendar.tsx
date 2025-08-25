import React from "react";
import CalendarClient from "./calendar-client";
import { Suspense } from "react";
import { getAllEinsaetzeForCalendar } from "@/features/einsatz/dal-einsatz";
import type {
  EinsatzForCalendar,
  CalendarEvent,
} from "@/features/einsatz/types";
import { CalendarMode } from "./types";
import { requireAuth } from "@/lib/auth/authGuard";


  
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
      status: einsatz.einsatz_status,
      assignedUsers: einsatz.einsatz_helper.map((helper) => helper.user_id),
    };
  });
};

import { mapEinsaetzeToCalendarEvents } from "./utils";


export default async function Calendar({ mode }: { mode: CalendarMode }) {
  const { session, userIds } = await requireAuth();
  console.log(session.user.email);
  const getEinsaetzeData = async () => {
    // hydrate client before rendering => faster initial load
    const einsaetze = await getAllEinsaetzeForCalendar([
      session.user.id, //JMH for testing
    ]);
    return mapEinsaetzeToCalendarEvents(einsaetze);
  };

  return (
    <Suspense fallback={<div>Lade Kalender...</div>}>
      <CalendarClient einsaetzeProp={getEinsaetzeData()} mode={mode} />
    </Suspense>
  );
}
