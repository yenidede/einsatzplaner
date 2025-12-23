"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ActivityLogList } from "./ActivityLogList";
import { ActivityLogListSkeleton } from "./ActivityLogListSkeleton";
import { queryKeys as ActivityLogQueryKeys } from "../queryKeys";
import { getActivitiesForEinsatzAction } from "../activity_log-actions";

interface EinsatzActivityLogProps {
  einsatzId: string;
  initialLimit?: number;
  className?: string;
}

export function EinsatzActivityLog({
  einsatzId,
  initialLimit = 3,
  className,
}: EinsatzActivityLogProps) {
  const [showAll, setShowAll] = useState(false);

  const limitedQuery = useQuery({
    queryKey: ActivityLogQueryKeys.einsatz(einsatzId, initialLimit),
    queryFn: () => getActivitiesForEinsatzAction(einsatzId, initialLimit),
    enabled: !!einsatzId && !showAll,
  });

  const allQuery = useQuery({
    queryKey: ActivityLogQueryKeys.einsatz(einsatzId, 9999),
    queryFn: () => getActivitiesForEinsatzAction(einsatzId, 9999),
    enabled: !!einsatzId && showAll,
  });

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
      toast.error("Aktivitäten konnten nicht geladen werden", {
        id: "einsatz-activity-error",
      });
    }
  }, [limitedQuery.data?.success, allQuery.data?.success]);

  const isLoading =
    !limitedQuery.data &&
    (limitedQuery.isLoading || (showAll && allQuery.isLoading));

  if (isLoading) {
    return <ActivityLogListSkeleton className="max-h-64 overflow-auto" />;
  }

  if (!activities) {
    return (
      <div className="text-muted-foreground text-sm">
        Aktivitäten konnten nicht geladen werden.
      </div>
    );
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
