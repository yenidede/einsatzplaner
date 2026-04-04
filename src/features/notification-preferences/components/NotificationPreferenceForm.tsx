'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMyOrganizationNotificationPreferences,
  useUpdateMyNotificationDetails,
  useUpdateMyNotificationPrimary,
} from '../hooks';
import { OrganizationNotificationCard } from './OrganizationNotificationCard';

interface NotificationPreferenceFormProps {
  userId: string | undefined;
}

export function NotificationPreferenceForm({
  userId,
}: NotificationPreferenceFormProps) {
  const [primarySavingOrganizationId, setPrimarySavingOrganizationId] =
    useState<string | null>(null);
  const [detailsSavingOrganizationId, setDetailsSavingOrganizationId] =
    useState<string | null>(null);

  const { data, isLoading, error } =
    useMyOrganizationNotificationPreferences(userId);
  const primaryMutation = useUpdateMyNotificationPrimary(userId);
  const detailsMutation = useUpdateMyNotificationDetails(userId);

  if (!userId) {
    return (
      <p className="text-muted-foreground text-sm">
        Benachrichtigungseinstellungen werden geladen...
      </p>
    );
  }

  const handleAutoSavePrimary = async (input: {
    organizationId: string;
    useOrganizationDefaults?: boolean;
    emailEnabled?: boolean;
  }) => {
    setPrimarySavingOrganizationId(input.organizationId);

    try {
      await primaryMutation.mutateAsync(input);
    } finally {
      setPrimarySavingOrganizationId((current) =>
        current === input.organizationId ? null : current
      );
    }
  };

  const handleSaveDetails = async (input: {
    organizationId: string;
    deliveryMode: 'critical_only' | 'digest_only' | 'critical_and_digest';
    minimumPriority: 'info' | 'review' | 'critical';
    digestInterval: 'daily' | 'twice_daily';
  }) => {
    setDetailsSavingOrganizationId(input.organizationId);

    try {
      await detailsMutation.mutateAsync(input);
      toast.success('Einstellungen wurden gespeichert.');
    } finally {
      setDetailsSavingOrganizationId((current) =>
        current === input.organizationId ? null : current
      );
    }
  };

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
      {data.map((card) => (
        <OrganizationNotificationCard
          key={card.organizationId}
          card={card}
          isAutoSaving={
            primaryMutation.isPending &&
            primarySavingOrganizationId === card.organizationId
          }
          isSavingDetails={
            detailsMutation.isPending &&
            detailsSavingOrganizationId === card.organizationId
          }
          onAutoSavePrimary={handleAutoSavePrimary}
          onSaveDetails={handleSaveDetails}
        />
      ))}
    </div>
  );
}
