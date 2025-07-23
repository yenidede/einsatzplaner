import React from "react";
import Calendar from "@/components/event-calendar/calendar";

export default function Helferansicht() {
  return (
    <>
      <h1>Einsätze</h1>
      <p className="text-slate-600 leading-7">
        Hier kannst du dich bei Einsätzen eintragen. Organisationen werden
        anschließend automatisch informiert.
      </p>
      <div className="mt-6">
        <Calendar mode="helper" />
      </div>
    </>
  );
}
