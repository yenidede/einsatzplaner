"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";
import type { ChangeLogEntry } from "../types";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getFormattedMessage } from "../utils";
import { Button } from "@/components/ui/button";

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

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityItem({ activity }: { activity: ChangeLogEntry }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2">
      <div
        className="rounded-full w-8 h-8 flex justify-center items-center relative"
        style={{ backgroundColor: activity.change_type.change_color }}
      >
        <Image
          src={activity.change_type.change_icon_url}
          alt={activity.change_type.name}
          unoptimized
          width={16}
          height={16}
          className="text-foreground"
        ></Image>
      </div>
      <div className="grow">{getFormattedMessage(activity)}</div>
      <time className="text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(activity.created_at) +
          " " +
          formatTime(activity.created_at)}
      </time>
    </div>
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
    <div className="space-y-1">
      <div className="flex justify-between">
        <h4 className="text-base font-semibold mb-3">{title}</h4>
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
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Noch keine Aktivitäten vorhanden
      </div>
    );
  }

  const handleLoadAll = () => {
    setShowAll((prev) => !prev);
  };

  const toggleButton = (
    <Button
      variant={"link"}
      onClick={handleLoadAll}
      disabled={isRemainingLoading}
    >
      {isRemainingLoading
        ? "Lade..."
        : showAll
        ? "Weniger anzeigen"
        : "Alle anzeigen"}
    </Button>
  );

  return (
    <>
      <div className={cn("space-y-6", className)}>
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
      </div>
    </>
  );
}
