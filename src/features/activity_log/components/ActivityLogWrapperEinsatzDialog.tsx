'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ActivityLogList } from './ActivityLogList';
import { ActivityLogListSkeleton } from './ActivityLogListSkeleton';
import { useEinsatzActivityLogs } from '../hooks/useActivityLogs';

interface EinsatzActivityLogProps {
  einsatzId: string | null;
  initialLimit?: number;
  className?: string;
}

export function EinsatzActivityLog({
  einsatzId,
  initialLimit = 3,
  className,
}: EinsatzActivityLogProps) {
  const MAX_ACTIVITIES_LIMIT = 9999;
  const [showAll, setShowAll] = useState(false);

  const limitedQuery = useEinsatzActivityLogs(
    einsatzId,
    initialLimit,
    !showAll
  );

  const allQuery = useEinsatzActivityLogs(
    einsatzId,
    MAX_ACTIVITIES_LIMIT,
    showAll
  );

  const activities = useMemo(() => {
    const limited = limitedQuery.data?.data?.activities;
    const all = allQuery.data?.data?.activities;

    const preferred = showAll ? all : limited;
    const fallback = showAll ? limited : all;

    return preferred ?? fallback ?? null;
  }, [
    showAll,
    limitedQuery.data?.data?.activities,
    allQuery.data?.data?.activities,
  ]);

  useEffect(() => {
    if (
      limitedQuery.data?.success === false ||
      allQuery.data?.success === false
    ) {
      toast.error('Aktivitäten konnten nicht geladen werden', {
        id: 'einsatz-activity-error',
      });
    }
  }, [limitedQuery.data?.success, allQuery.data?.success]);

  const isLoading =
    !limitedQuery.data &&
    (limitedQuery.isLoading || (showAll && allQuery.isLoading));

  if (isLoading) {
    return <ActivityLogListSkeleton className="max-h-64 overflow-auto" />;
  }

  // Dont show anything if no einsatzId is provided (einsatz is newly created)
  if (!activities) {
    return null;
  }

  return (
    <ActivityLogList
      className={className}
      activities={activities}
      showAll={showAll}
      setShowAll={setShowAll}
      isRemainingLoading={allQuery.isLoading}
    />
  );
}
