'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityLogListSkeletonProps {
  className?: string;
  itemCount?: number;
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="grow space-y-2">
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-4 w-20 shrink-0" />
    </div>
  );
}

function ActivityGroupSkeleton({
  title,
  itemCount = 5,
}: {
  title: string;
  itemCount?: number;
}) {
  return (
    <div className="space-y-1">
      <h4 className="mb-3 text-base font-semibold">{title}</h4>
      {Array.from({ length: itemCount }).map((_, index) => (
        <ActivityItemSkeleton key={index} />
      ))}
    </div>
  );
}

export function ActivityLogListSkeleton({
  className,
  itemCount = 3,
}: ActivityLogListSkeletonProps) {
  const todayCount = Math.ceil(itemCount / 2);
  const yesterdayCount = Math.floor(itemCount / 3);
  const earlierCount = itemCount - todayCount - yesterdayCount;

  return (
    <div className={cn('space-y-6', className)}>
      {todayCount > 0 && (
        <ActivityGroupSkeleton title="Heute" itemCount={todayCount} />
      )}
      {yesterdayCount > 0 && (
        <ActivityGroupSkeleton title="Gestern" itemCount={yesterdayCount} />
      )}
      {earlierCount > 0 && (
        <ActivityGroupSkeleton title="Früher" itemCount={earlierCount} />
      )}
    </div>
  );
}
