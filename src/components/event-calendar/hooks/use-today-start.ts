'use client';

import { useEffect, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

function getTodayStart() {
  return startOfDay(new Date());
}

export function useTodayStart() {
  const [todayStart, setTodayStart] = useState<Date>(() => getTodayStart());

  useEffect(() => {
    const scheduleNextUpdate = () => {
      const nextMidnight = startOfDay(addDays(new Date(), 1));
      const timeout = nextMidnight.getTime() - Date.now();

      return window.setTimeout(() => {
        setTodayStart(getTodayStart());
      }, timeout);
    };

    const timeoutId = scheduleNextUpdate();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [todayStart]);

  return todayStart;
}
