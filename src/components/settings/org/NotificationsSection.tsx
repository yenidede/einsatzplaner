'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Organization } from '@/features/settings/types';

interface NotificationsSectionProps {
  organizations: Organization[];
  onNotificationChange: (orgId: string, value: boolean) => void;
}

export function NotificationsSection({
  organizations,
  onNotificationChange,
}: NotificationsSectionProps) {
  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="inline-flex items-center justify-between self-stretch border-b border-slate-200 px-4 py-2">
        <div className="flex flex-1 items-center justify-start gap-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Benachrichtigungen
          </div>
        </div>
      </div>

      <div className="inline-flex items-start justify-start gap-4 self-stretch py-2">
        <div className="flex flex-1 flex-col gap-2 px-4">
          {organizations.length > 0 ? (
            organizations.map((org) => {
              const isOn = org.hasGetMailNotification ?? true;

              return (
                <div
                  key={org.id}
                  className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5"
                >
                  <Label
                    htmlFor={`org-switch-${org.id}`}
                    className="text-sm font-medium"
                  >
                    Emails von <span className="font-bold">{org.name}</span>{' '}
                    erhalten
                  </Label>

                  <div className="inline-flex items-center gap-2">
                    <Switch
                      id={`org-switch-${org.id}`}
                      checked={isOn}
                      onCheckedChange={(checked) =>
                        onNotificationChange(org.id, checked)
                      }
                      aria-label={`Toggle switch for ${org.name}`}
                    />
                    <Label
                      htmlFor={`org-switch-${org.id}`}
                      className="text-sm font-medium"
                    >
                      {isOn ? 'On' : 'Off'}
                    </Label>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-slate-500">
              Keine Organisationen für Benachrichtigungen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
