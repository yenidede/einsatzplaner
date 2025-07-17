import React from "react";
import Calendar from "@/components/calendar/calendar";

export default function Helferansicht() {
  return (
    <>
      <h1>Helferansicht</h1>
      <p className="text-slate-600 leading-7">
        Hier kannst du dich bei Einsätzen eintragen. Organisationen werden
        anschließend automatisch informiert.
      </p>
      <Calendar />
    </>
  );
}
