import {
  EinsatzCreate,
  CalendarEvent,
  EinsatzDetailed,
} from '@/features/einsatz/types';
import { GetStatusById } from '@/features/einsatz_status/status-dal';

export async function EinsatzCreateToCalendarEvent(
  einsatz: EinsatzCreate
): Promise<CalendarEvent> {
  if (!einsatz.id) throw new Error('Einsatz must have an id');
  const status = einsatz.status_id
    ? await GetStatusById(einsatz.status_id)
    : null;

  return {
    id: einsatz.id,
    title: einsatz.title,
    start: einsatz.start,
    end: einsatz.end,
    allDay: einsatz.all_day ?? false,
    assignedUsers: einsatz.assignedUsers || [], // Fixed: use assignedUsers instead of assigned_users
    status: status ?? undefined,
  };
}
