'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyOrganizationNotificationPreferences,
  useUpdateMyNotificationDetails,
  useUpdateMyNotificationPrimary,
} from '../hooks';
import { getPreferenceSource } from '../notification-preferences-utils';
import type { OrganizationNotificationCardData } from '../types';
import { OrganizationNotificationCard, type NotificationCardDraft } from './OrganizationNotificationCard';

interface NotificationPreferenceFormProps {
  userId: string | undefined;
  disabled?: boolean;
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}

export interface NotificationPreferenceFormHandle {
  saveChanges: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

function createSavedDraftFromCard(
  card: OrganizationNotificationCardData
): NotificationCardDraft {
  return {
    useOrganizationDefaults: getPreferenceSource(card.preference) === 'organization',
    emailEnabled: card.effective.emailEnabled,
    deliveryMode: card.effective.deliveryMode,
    minimumPriority: card.effective.minimumPriority,
    digestInterval: card.effective.digestInterval,
    digestTime: card.effective.digestTime,
    digestSecondTime: card.effective.digestSecondTime,
  };
}

function areDraftsEqual(left: NotificationCardDraft, right: NotificationCardDraft) {
  return (
    left.useOrganizationDefaults === right.useOrganizationDefaults &&
    left.emailEnabled === right.emailEnabled &&
    left.deliveryMode === right.deliveryMode &&
    left.minimumPriority === right.minimumPriority &&
    left.digestInterval === right.digestInterval &&
    left.digestTime === right.digestTime &&
    left.digestSecondTime === right.digestSecondTime
  );
}

export const NotificationPreferenceForm = forwardRef<
  NotificationPreferenceFormHandle,
  NotificationPreferenceFormProps
>(function NotificationPreferenceForm(
  { userId, disabled = false, onUnsavedChangesChange },
  ref
) {
  const [draftsByOrganizationId, setDraftsByOrganizationId] = useState<
    Record<string, NotificationCardDraft>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, error } =
    useMyOrganizationNotificationPreferences(userId);
  const primaryMutation = useUpdateMyNotificationPrimary(userId);
  const detailsMutation = useUpdateMyNotificationDetails(userId);

  const savedDraftsByOrganizationId = useMemo(() => {
    const result: Record<string, NotificationCardDraft> = {};
    for (const card of data ?? []) {
      result[card.organizationId] = createSavedDraftFromCard(card);
    }
    return result;
  }, [data]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.entries(draftsByOrganizationId).some(([orgId, draft]) => {
      const savedDraft = savedDraftsByOrganizationId[orgId];
      return savedDraft ? !areDraftsEqual(draft, savedDraft) : false;
    });
  }, [draftsByOrganizationId, savedDraftsByOrganizationId]);

  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const validOrganizationIds = new Set(data.map((card) => card.organizationId));
    setDraftsByOrganizationId((current) => {
      const nextEntries = Object.entries(current).filter(([orgId]) =>
        validOrganizationIds.has(orgId)
      );
      return Object.fromEntries(nextEntries);
    });
  }, [data]);

  useEffect(() => {
    setDraftsByOrganizationId((current) => {
      const nextEntries = Object.entries(current).filter(([orgId, draft]) => {
        const savedDraft = savedDraftsByOrganizationId[orgId];
        return savedDraft ? !areDraftsEqual(draft, savedDraft) : true;
      });
      return Object.fromEntries(nextEntries);
    });
  }, [savedDraftsByOrganizationId]);

  const saveChanges = useCallback(async () => {
    if (!data || data.length === 0) {
      return;
    }

    const changedCards = data
      .map((card) => {
        const savedDraft = savedDraftsByOrganizationId[card.organizationId];
        const currentDraft =
          draftsByOrganizationId[card.organizationId] ?? savedDraft;
        if (
          !savedDraft ||
          !currentDraft ||
          areDraftsEqual(currentDraft, savedDraft)
        ) {
          return null;
        }
        return { card, savedDraft, currentDraft };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    if (changedCards.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      for (const item of changedCards) {
        const { card, savedDraft, currentDraft } = item;
        const sourceChanged =
          currentDraft.useOrganizationDefaults !==
          savedDraft.useOrganizationDefaults;
        const emailChanged = currentDraft.emailEnabled !== savedDraft.emailEnabled;

        if (sourceChanged || (!currentDraft.useOrganizationDefaults && emailChanged)) {
          await primaryMutation.mutateAsync({
            organizationId: card.organizationId,
            ...(sourceChanged
              ? { useOrganizationDefaults: currentDraft.useOrganizationDefaults }
              : {}),
            ...(!currentDraft.useOrganizationDefaults
              ? { emailEnabled: currentDraft.emailEnabled }
              : {}),
          });
        }

        const detailsChanged =
          currentDraft.deliveryMode !== savedDraft.deliveryMode ||
          currentDraft.minimumPriority !== savedDraft.minimumPriority ||
          currentDraft.digestInterval !== savedDraft.digestInterval ||
          currentDraft.digestTime !== savedDraft.digestTime ||
          currentDraft.digestSecondTime !== savedDraft.digestSecondTime;

        if (
          !currentDraft.useOrganizationDefaults &&
          currentDraft.emailEnabled &&
          detailsChanged
        ) {
          await detailsMutation.mutateAsync({
            organizationId: card.organizationId,
            deliveryMode: currentDraft.deliveryMode,
            minimumPriority: currentDraft.minimumPriority,
            digestInterval: currentDraft.digestInterval,
            digestTime: currentDraft.digestTime,
            digestSecondTime: currentDraft.digestSecondTime,
          });
        }
      }

      toast.success('Benachrichtigungseinstellungen wurden gespeichert.');
    } finally {
      setIsSaving(false);
    }
  }, [
    data,
    savedDraftsByOrganizationId,
    draftsByOrganizationId,
    primaryMutation,
    detailsMutation,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      saveChanges,
      hasUnsavedChanges: () => hasUnsavedChanges,
    }),
    [hasUnsavedChanges, saveChanges]
  );

  if (!userId) {
    return (
      <p className="text-muted-foreground text-sm">
        Benachrichtigungseinstellungen werden geladen...
      </p>
    );
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm">
        Einstellungen werden geladen...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Benachrichtigungseinstellungen konnten nicht geladen werden.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Bell className="text-muted-foreground/50 mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-sm">
          Sie sind noch keiner Organisation beigetreten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((card) => {
        const savedDraft = savedDraftsByOrganizationId[card.organizationId];
        const draft = draftsByOrganizationId[card.organizationId] ?? savedDraft;

        if (!draft) {
          return null;
        }

        return (
          <OrganizationNotificationCard
            key={card.organizationId}
            card={card}
            draft={draft}
            onDraftChange={(nextDraft) => {
              setDraftsByOrganizationId((current) => {
                if (savedDraft && areDraftsEqual(nextDraft, savedDraft)) {
                  const { [card.organizationId]: _, ...rest } = current;
                  return rest;
                }

                return {
                  ...current,
                  [card.organizationId]: nextDraft,
                };
              });
            }}
            disabled={disabled || isSaving}
          />
        );
      })}
    </div>
  );
});
