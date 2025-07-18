"use client";

import type { EventClickArg } from "@fullcalendar/core";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import type { SelectedEvent, ScheduleGroup } from "./types";
import { formatTimeForDisplay, transformScheduleToEvents } from "./utils";

/**
 * Custom hook for managing calendar state and event handling
 */
export const useCalendarState = (scheduleData?: ScheduleGroup) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null
  );

  // Transform schedule data to calendar events
  const events = useMemo(() => {
    return transformScheduleToEvents(scheduleData || {});
  }, [scheduleData]);

  // Handle event click with proper typing and formatting
  const handleEventClick = useCallback(
    (
      eventInfo: EventClickArg,
      onEventClick?: (eventInfo: EventClickArg) => void
    ) => {
      const { start, end, title, extendedProps } = eventInfo.event;

      setSelectedEvent({
        title,
        startTime: formatTimeForDisplay(start),
        endTime: formatTimeForDisplay(end),
        date: extendedProps.date || format(new Date(), "yyyy-MM-dd"),
        organization: extendedProps.organization,
      });

      setIsModalOpen(true);
      onEventClick?.(eventInfo);
    },
    []
  );

  // Close modal handler
  const closeModal = useCallback((open?: boolean) => {
    setIsModalOpen(open ?? false);
    if (!open) {
      setSelectedEvent(null);
    }
  }, []);

  return {
    events,
    selectedEvent,
    isModalOpen,
    handleEventClick,
    closeModal,
  };
};
