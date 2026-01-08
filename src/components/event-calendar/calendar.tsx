'use client';

// Thin client wrapper around the calendar logic (implemented in CalendarClient).
// Previously this file was marked with "use server" and exported an async function,
// which caused React/Next to treat it as a Server Component while it was imported
// inside a Client Component page. That mismatch can produce hydration churn and,
// depending on surrounding code, cascading state updates leading to the
// "Maximum update depth exceeded" error you observed. Making this a pure client
// wrapper removes that mismatch.
import CalendarClient from './calendar-client';
import { CalendarMode } from './types';

export default function Calendar({ mode }: { mode: CalendarMode }) {
  return <CalendarClient mode={mode} />;
}
