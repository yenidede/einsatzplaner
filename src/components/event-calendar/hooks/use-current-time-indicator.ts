"use client"

import { useEffect, useState } from "react"
import { endOfWeek, isSameDay, isWithinInterval, startOfWeek } from "date-fns"

import { EndHour, StartHour } from "@/components/event-calendar/constants"

export function useCurrentTimeIndicator(
  currentDate: Date,
  view: "day" | "week",
  startHour: number = StartHour,
  endHour: number = EndHour
) {
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0)
  const [currentTimeVisible, setCurrentTimeVisible] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()

      // Check if current time is within the displayed range
      const currentTimeInRange = hours >= startHour && hours < endHour;

      const totalMinutes = (hours - startHour) * 60 + minutes
      const dayStartMinutes = 0 // start of the range
      const dayEndMinutes = (endHour - startHour) * 60 // end of the range

      // Calculate position as percentage of displayed time range
      const position =
        ((totalMinutes - dayStartMinutes) / (dayEndMinutes - dayStartMinutes)) *
        100

      // Check if current day is in view based on the calendar view
      let isCurrentTimeVisible = false

      if (view === "day") {
        isCurrentTimeVisible = isSameDay(now, currentDate) && currentTimeInRange
      } else if (view === "week") {
        const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 0 })
        const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn: 0 })
        isCurrentTimeVisible = isWithinInterval(now, {
          start: startOfWeekDate,
          end: endOfWeekDate,
        }) && currentTimeInRange
      }

      setCurrentTimePosition(Math.max(0, Math.min(100, position)))
      setCurrentTimeVisible(isCurrentTimeVisible)
    }

    // Calculate immediately
    calculateTimePosition()

    // Update every minute
    const interval = setInterval(calculateTimePosition, 60000)

    return () => clearInterval(interval)
  }, [currentDate, view, startHour, endHour])

  return { currentTimePosition, currentTimeVisible }
}
