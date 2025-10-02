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

export default async function Calendar({ mode }: { mode: CalendarMode }) {
  const { session } = await requireAuth();
  const orgs = session.orgId ? [session.orgId] : session.orgIds;
  if (!orgs || orgs.length === 0) {
  }

  const getEinsaetzeData = async () => {
    // hydrate client before rendering => faster initial load
    const einsaetze = await getAllEinsaetzeForCalendar(orgs);
    return mapEinsaetzeToCalendarEvents(einsaetze);
  };

  return (
    <Suspense fallback={<div>Lade Kalender...</div>}>
      <CalendarClient einsaetzeProp={getEinsaetzeData()} mode={mode} />
    </Suspense>
  );
}
