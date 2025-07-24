import { EinsatzCreate, CalendarEvent, EinsatzDetailed } from '@/features/einsatz/types'; 

export function EinsatzCreateToCalendarEvent(einsatz: EinsatzCreate): CalendarEvent {
    if (!einsatz.id) throw new Error("Einsatz must have an id");
    
    return {
        id: einsatz.id,
        title: einsatz.title,
        start: new Date(einsatz.start),
        end: new Date(einsatz.end),
        allDay: einsatz.all_day ?? false,
        assignedUsers: einsatz.assignedUsers || [],
    };
}