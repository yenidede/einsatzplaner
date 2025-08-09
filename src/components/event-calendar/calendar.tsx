import React from "react";
import CalendarClient from "./calendar-client";
import { Suspense } from "react";
import { getAllEinsaetzeForCalendar } from "@/features/einsatz/dal-einsatz";
import type {
  EinsatzForCalendar,
  CalendarEvent,
} from "@/features/einsatz/types";
import { CalendarMode } from "./types";
import { mapEinsaetzeToCalendarEvents } from "./utils";

export default function Calendar({ mode }: { mode: CalendarMode }) {
  const getEinsaetzeData = async () => {
    // hydrate client before rendering => faster initial load
    const einsaetze = await getAllEinsaetzeForCalendar([
      "0c39989e-07bc-4074-92bc-aa274e5f22d0", //JMH for testing
    ]);
    return mapEinsaetzeToCalendarEvents(einsaetze);
  };

  return (
    <Suspense fallback={<div>Lade Kalender...</div>}>
      <CalendarClient einsaetzeProp={getEinsaetzeData()} mode={mode} />
    </Suspense>
  );
}
