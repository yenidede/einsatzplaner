"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { motion } from "framer-motion";
import { type FC, useRef } from "react";
import { cn } from "@/lib/utils";
import { EventDetailsModal } from "./EventDetailsModal";
import { useCalendarState } from "./hooks";
import type { CalendarProps, Language } from "./types";
import { getLocale } from "./utils";

/**
 * Main Calendar component with FullCalendar integration
 */
export const CalendarComponent: FC<CalendarProps> = ({
  scheduleData,
  onEventClick,
  maxEventsPerDay = 4,
}) => {
  const currentLanguage: Language = "de"; // Default to German
  const calendarRef = useRef<FullCalendar>(null);

  const { events, selectedEvent, isModalOpen, handleEventClick, closeModal } =
    useCalendarState(scheduleData);

  const onCalendarEventClick = (eventInfo: EventClickArg) => {
    handleEventClick(eventInfo, onEventClick);
  };

  const renderEventContent = (arg: EventContentArg) => {
    const { event, view } = arg;
    if (view.type === "dayGridMonth") {
      return {
        html: `
          <div class="fc-event-main">
            <div class="fc-event-title">${event.title}</div>
          </div>
        `,
      };
    }
    return true;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className={cn("border-none w-full bg-white")}>
          <FullCalendar
            ref={calendarRef}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin,
              listPlugin,
            ]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,today,next",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listYear",
            }}
            views={{
              dayGridMonth: {
                titleFormat: { year: "numeric", month: "long" },
                dayMaxEvents: maxEventsPerDay,
              },
              timeGridWeek: {
                titleFormat: { year: "numeric", month: "long", day: "2-digit" },
              },
              timeGridDay: {
                titleFormat: { year: "numeric", month: "long", day: "2-digit" },
              },
              listWeek: {
                titleFormat: { year: "numeric", month: "long" },
              },
            }}
            locale={getLocale(currentLanguage)}
            events={events}
            eventClick={onCalendarEventClick}
            height="auto"
            themeSystem="standard"
            eventContent={renderEventContent}
            slotLabelFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            }}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              hour12: false,
            }}
            aspectRatio={1.6}
            slotMinTime="06:00:00"
            slotDuration="00:30:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            editable={false}
            selectable={false}
            selectMirror={true}
            weekends={true}
            nowIndicator={true}
            dayMaxEvents={maxEventsPerDay}
          />
        </div>
      </motion.div>

      <EventDetailsModal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        eventData={selectedEvent}
      />
    </>
  );
};
