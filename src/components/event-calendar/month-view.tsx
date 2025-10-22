"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DraggableEvent,
  DroppableCell,
  EventHeight,
  EventItem,
  getAllEventsForDay,
  isMultiDayEvent,
  sortEvents,
  type CalendarEvent,
} from "@/components/event-calendar";
import {
  DefaultStartHour,
  MaxEventsPerCellInMonthView,
} from "@/components/event-calendar/constants";
import { CalendarMode } from "./types";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate: (startTime: Date) => void;
  mode: CalendarMode;
}

export function MonthView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  mode,
}: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weekdays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
      return format(date, "EEE", { locale: de });
    });
  }, []);

  const weeks = useMemo(() => {
    const result = [];
    let week = [];

    for (let i = 0; i < days.length; i++) {
      week.push(days[i]);
      if (week.length === 7 || i === days.length - 1) {
        result.push(week);
        week = [];
      }
    }

    return result;
  }, [days]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div data-slot="month-view" className="contents">
      <div className="border-border/70 grid grid-cols-7 border-b">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground/70 py-2 text-center text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-[minmax(calc(var(--event-height)*3),auto)]">
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day) => {
              if (!day) return null; // Skip if day is undefined

              // Get events for this day, normalizing multi-day events to separate instances
              const allDayEventsForDay: CalendarEvent[] = [];

              // Process all events to create normalized instances for multi-day events
              events.forEach((event) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);

                // Check if this event occurs on this day
                const isOnThisDay =
                  isSameDay(day, eventStart) ||
                  isSameDay(day, eventEnd) ||
                  (day > eventStart && day < eventEnd);

                if (isOnThisDay) {
                  if (isMultiDayEvent(event) && !event.allDay) {
                    // For multi-day events with specific times, create a normalized instance for this day
                    const timeOnlyStart = new Date(eventStart);
                    const timeOnlyEnd = new Date(eventEnd);

                    // Normalize to current day with original times
                    const normalizedStart = new Date(day);
                    normalizedStart.setHours(timeOnlyStart.getHours());
                    normalizedStart.setMinutes(timeOnlyStart.getMinutes());
                    normalizedStart.setSeconds(timeOnlyStart.getSeconds());

                    const normalizedEnd = new Date(day);
                    normalizedEnd.setHours(timeOnlyEnd.getHours());
                    normalizedEnd.setMinutes(timeOnlyEnd.getMinutes());
                    normalizedEnd.setSeconds(timeOnlyEnd.getSeconds());

                    // Create normalized event for this day
                    allDayEventsForDay.push({
                      ...event,
                      start: normalizedStart,
                      end: normalizedEnd,
                    });
                  } else if (isSameDay(day, eventStart) || event.allDay) {
                    // For single-day events or all-day events, include only if it starts on this day
                    allDayEventsForDay.push(event);
                  }
                }
              });

              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = `month-cell-${day.toISOString()}`;
              const allEvents = getAllEventsForDay(events, day);

              const hasMore =
                allDayEventsForDay.length > MaxEventsPerCellInMonthView;
              const remainingCount = hasMore
                ? allDayEventsForDay.length - MaxEventsPerCellInMonthView
                : 0;

              return (
                <div
                  key={day.toString()}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0"
                  data-today={isToday(day) || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  <DroppableCell
                    id={cellId}
                    date={day}
                    onClick={() => {
                      const startTime = new Date(day);
                      startTime.setHours(DefaultStartHour, 0, 0);
                      onEventCreate(startTime);
                    }}
                  >
                    <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm">
                      {format(day, "d")}
                    </div>
                    <div>
                      {sortEvents(allDayEventsForDay).map((event, index) => {
                        const eventStart = new Date(event.start);
                        const eventEnd = new Date(event.end);
                        const isFirstDay = isSameDay(day, eventStart);
                        const isLastDay = isSameDay(day, eventEnd);

                        const isHidden =
                          isMounted &&
                          MaxEventsPerCellInMonthView &&
                          index >= MaxEventsPerCellInMonthView;

                        if (!isFirstDay) {
                          return (
                            <div
                              key={`spanning-${event.id}-${day
                                .toISOString()
                                .slice(0, 10)}`}
                              className="aria-hidden:hidden"
                              aria-hidden={isHidden ? "true" : undefined}
                            >
                              <EventItem
                                onClick={(e) => handleEventClick(event, e)}
                                event={event}
                                view="month"
                                isFirstDay={isFirstDay}
                                isLastDay={isLastDay}
                                mode={mode}
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={event.id}
                            className="aria-hidden:hidden"
                            aria-hidden={isHidden ? "true" : undefined}
                          >
                            <DraggableEvent
                              event={event}
                              view="month"
                              onClick={(e) => handleEventClick(event, e)}
                              isFirstDay={isFirstDay}
                              isLastDay={isLastDay}
                              mode={mode}
                            />
                          </div>
                        );
                      })}

                      {hasMore && (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button
                              className="focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 mt-[var(--event-gap)] flex min-h-fit w-full items-center px-1 text-left text-[10px] backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] sm:px-2 sm:text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>
                                + {remainingCount}{" "}
                                <span className="max-sm:sr-only">more</span>
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="max-w-52 p-3"
                            style={
                              {
                                "--event-height": `${EventHeight}px`,
                              } as React.CSSProperties
                            }
                          >
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {format(day, "EEE d", { locale: de })}
                              </div>
                              <div className="space-y-1">
                                {sortEvents(allEvents).map((event) => {
                                  const eventStart = new Date(event.start);
                                  const eventEnd = new Date(event.end);
                                  const isFirstDay = isSameDay(day, eventStart);
                                  const isLastDay = isSameDay(day, eventEnd);

                                  return (
                                    <EventItem
                                      key={event.id}
                                      onClick={(e) =>
                                        handleEventClick(event, e)
                                      }
                                      event={event}
                                      view="month"
                                      isFirstDay={isFirstDay}
                                      isLastDay={isLastDay}
                                      mode={mode}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </DroppableCell>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
