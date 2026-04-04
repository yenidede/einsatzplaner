'use client';

import CalendarClient from './calendar-client';
import { CalendarMode } from './types';

export default function Calendar({ mode }: { mode: CalendarMode }) {
  return <CalendarClient mode={mode} />;
}
