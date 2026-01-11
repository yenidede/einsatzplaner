'use client';

import { Dispatch, SetStateAction, useMemo } from 'react';
import type { ChangeLogEntry } from '../types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getFormattedMessage } from '../utils';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useEventDialog } from '@/hooks/use-event-dialog';

interface ActivityLogListProps {
  activities: ChangeLogEntry[];
  className?: string;
  renderCount?: number;
  showAll: boolean;
  isRemainingLoading: boolean;
  setShowAll: Dispatch<SetStateAction<boolean>>;
}

interface GroupedActivities {
  heute: ChangeLogEntry[];
  gestern: ChangeLogEntry[];
  frueher: ChangeLogEntry[];
}

function groupActivitiesByTime(
  activities: ChangeLogEntry[]
): GroupedActivities {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const grouped: GroupedActivities = {
    heute: [],
    gestern: [],
    frueher: [],
  };

  activities.forEach((activity) => {
    const activityDate = new Date(activity.created_at);
    const activityDateOnly = new Date(
      activityDate.getFullYear(),
      activityDate.getMonth(),
      activityDate.getDate()
    );

    if (activityDateOnly.getTime() === today.getTime()) {
      grouped.heute.push(activity);
    } else if (activityDateOnly.getTime() === yesterday.getTime()) {
      grouped.gestern.push(activity);
    } else {
      grouped.frueher.push(activity);
    }
  });

  return grouped;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityItem({ activity }: { activity: ChangeLogEntry }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div
          className="relative flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: activity.change_type.change_color }}
        >
          <Image
            src={activity.change_type.change_icon_url}
            alt={activity.change_type.name}
            width={14}
            height={14}
            unoptimized
            className="text-foreground h-3 w-3"
          ></Image>
        </div>
        <div className="grow">{getFormattedMessage(activity)}</div>
        <time className="text-muted-foreground text-sm whitespace-nowrap">
          {formatDate(activity.created_at)}
        </time>
      </div>
      <div className="flex h-4 w-6 items-center justify-center">
        <div className="h-3 border-l"></div>
      </div>
    </>
  );
}

function ActivityGroup({
  title,
  activities,
  button,
}: {
  title: string;
  button?: React.ReactNode;
  activities: ChangeLogEntry[];
}) {
  if (activities.length === 0) return null;

  return (
    <div className="pb-4 [&>div:last-child]:hidden">
      <div className="flex justify-between">
        <h4 className="mb-3 font-semibold">{title}</h4>
        {button}
      </div>
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export function ActivityLogList({
  activities,
  className,
  showAll,
  setShowAll,
  isRemainingLoading,
}: ActivityLogListProps) {
  const groupedActivities = useMemo(
    () => groupActivitiesByTime(activities),
    [activities]
  );

  if (activities.length === 0) {
    return (
      <div className={cn('text-muted-foreground py-8 text-center', className)}>
        Noch keine Aktivitäten vorhanden
      </div>
    );
  }

  const handleLoadAll = () => {
    setShowAll((prev) => !prev);
  };

  const toggleButton = (
    <Button
      variant={'link'}
      onClick={handleLoadAll}
      disabled={isRemainingLoading}
      className="p-0"
    >
      {isRemainingLoading
        ? 'Lade...'
        : showAll
          ? 'Weniger anzeigen'
          : 'Alle anzeigen'}
    </Button>
  );

  return (
    <>
      <motion.div
        className={cn('space-y-6 text-sm', className)}
        initial={{ height: 212, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1, originY: 0 }}
        exit={{ height: 212, opacity: 0 }}
        style={{ overflow: 'hidden' }}
      >
        <ActivityGroup
          title="Heute"
          activities={groupedActivities.heute}
          button={toggleButton}
        />
        <ActivityGroup
          title="Gestern"
          activities={groupedActivities.gestern}
          button={
            groupedActivities.heute.length === 0 ? toggleButton : undefined
          }
        />
        <ActivityGroup
          title="Früher"
          activities={groupedActivities.frueher}
          button={
            groupedActivities.heute.length +
              groupedActivities.gestern.length ===
            0
              ? toggleButton
              : undefined
          }
        />
      </motion.div>
    </>
  );
}
