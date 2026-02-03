'use client';

import { useState, useEffect } from 'react';
import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';
import { getFormattedMessage } from '@/features/activity_log/utils';
import { useEventDialog } from '@/hooks/use-event-dialog';
import { useSession } from 'next-auth/react';
import { useActivityLogs } from '@/features/activity_log/hooks/useActivityLogs';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { AllActivitiesModal } from '@/features/activity_log/components/AllActivitiesModal';

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

const READ_ACTIVITIES_KEY = 'read_activities';

// Query Keys

const getReadActivities = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();

  try {
    const stored = localStorage.getItem(READ_ACTIVITIES_KEY);
    if (!stored) return new Set();

    const parsed = JSON.parse(stored) as string[];
    return new Set(parsed);
  } catch (error) {
    console.error('Failed to parse read activities from localStorage:', error);
    return new Set();
  }
};

const saveReadActivities = (readIds: Set<string>) => {
  if (typeof window === 'undefined') return;

  try {
    const array = Array.from(readIds);
    localStorage.setItem(READ_ACTIVITIES_KEY, JSON.stringify(array));
  } catch (error) {
    console.error('Failed to save read activities to localStorage:', error);
  }
};

const markActivityAsRead = (activityId: string) => {
  const readActivities = getReadActivities();
  readActivities.add(activityId);
  saveReadActivities(readActivities);
};

const markAllActivitiesAsRead = (activityIds: string[]) => {
  const readActivities = getReadActivities();
  activityIds.forEach((id) => readActivities.add(id));
  saveReadActivities(readActivities);
};

export default function NotificationMenu() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [allActivitiesModalOpen, setAllActivitiesModalOpen] = useState(false);
  const { openDialog } = useEventDialog();
  const queryClient = useQueryClient();

  const { data: session } = useSession();

  const { data, isLoading } = useActivityLogs({ limit: 10, offset: 0 });

  const orgIds = session?.user.orgIds;
  const { data: orgsData } = useOrganizations(
    orgIds && orgIds.length > 1 ? orgIds : undefined
  );

  const activities = data || [];

  // Read IDs beim Mount laden
  useEffect(() => {
    setReadIds(getReadActivities());
  }, []);

  // Beim Öffnen des Popovers refetch
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({
        queryKey: activityLogQueryKeys.list({ limit: 10, offset: 0 }),
      });
    }
  }, [isOpen, queryClient]);

  const handleViewAll = () => {
    setIsOpen(false);
    setAllActivitiesModalOpen(true);
  };

  const handleMarkAsRead = (id: string) => {
    markActivityAsRead(id);
    setReadIds((prev) => new Set([...prev, id]));
  };

  const unreadIds = new Set(
    activities.filter((a) => !readIds.has(a.id)).map((a) => a.id)
  );
  const unreadCount = unreadIds.size;

  const handleMarkAllAsRead = () => {
    const activityIds = activities.map((a) => a.id);
    markAllActivitiesAsRead(activityIds);
    setReadIds(new Set([...readIds, ...activityIds]));
  };

  const handleNotificationClick = (id: string) => {
    handleMarkAsRead(id);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground relative size-8 rounded-full shadow-none"
          aria-label="Open notifications"
        >
          <BellIcon size={16} aria-hidden="true" />
          {unreadCount > 0 && (
            <div
              aria-hidden="true"
              className="bg-primary absolute top-0.5 right-0.5 size-1 rounded-full"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">Aktivitäten</div>
          {unreadCount > 0 && (
            <button
              className="cursor-pointer text-xs font-medium hover:underline"
              onClick={handleMarkAllAsRead}
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="bg-border -mx-1 my-1 h-px"
        ></div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground px-3 py-8 text-center text-sm">
              Lade Aktivitäten...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-muted-foreground px-3 py-8 text-center text-sm">
              Keine Aktivitäten vorhanden
            </div>
          ) : (
            activities.map((activity) => {
              const isUnread = !readIds.has(activity.id);

              return (
                <div
                  key={activity.id}
                  className="hover:bg-accent flex rounded-md px-3 py-2 text-sm transition-colors"
                >
                  <div className="relative flex w-full min-w-0 items-start gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${activity.change_type.change_color}15`,
                      }}
                    >
                      {activity.change_type.change_icon_url ? (
                        <Image
                          src={activity.change_type.change_icon_url}
                          alt={activity.change_type.name}
                          className="h-4 w-4 object-contain"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: activity.change_type.change_color,
                          }}
                        />
                      )}
                    </div>

                    <button
                      className="flex min-w-0 flex-1 flex-col items-start space-y-1 text-left"
                      onClick={() => handleNotificationClick(activity.id)}
                    >
                      <div>{getFormattedMessage(activity, openDialog)}</div>

                      <div className="text-muted-foreground flex w-full min-w-0 justify-between text-xs">
                        <span className="shrink-0">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>

                        {orgsData && orgsData.length > 1 && (
                          <span className="ms-2 min-w-0 truncate">
                            {orgsData.find(
                              (org) => org.id === activity.einsatz.org_id
                            )?.name ?? 'Ladefehler'}
                          </span>
                        )}
                      </div>
                    </button>
                    {isUnread && (
                      <div className="absolute end-0 self-center">
                        <span className="sr-only">Ungelesen</span>
                        <Dot />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {activities.length > 0 && (
          <>
            <div
              role="separator"
              aria-orientation="horizontal"
              className="bg-border -mx-1 my-1 h-px"
            ></div>
            <div className="px-3 py-2 text-center">
              <Button onClick={handleViewAll} variant={'link'} size={'sm'}>
                Alle Aktivitäten anzeigen
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
      <AllActivitiesModal
        open={allActivitiesModalOpen}
        onOpenChange={setAllActivitiesModalOpen}
        openDialog={openDialog}
        readIds={readIds}
        onMarkAsRead={function (id: string): void {
          handleMarkAsRead(id);
        }}
      />
    </Popover>
  );
}
