"use client";

import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";
import { Organization } from "../../types";

interface NotificationsSectionProps {
  organizations: Organization[];
  onNotificationChange: (orgId: string, value: boolean) => void;
}

export function NotificationsSection({
  organizations,
  onNotificationChange,
}: NotificationsSectionProps) {
  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Benachrichtigungen
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
        <div className="flex-1 px-4 flex flex-col gap-2">
          {organizations.length > 0 ? (
            organizations.map((org) => {
              const isOn = org.hasGetMailNotification ?? true;

              return (
                <div
                  key={org.id}
                  className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5"
                >
                  <Label
                    htmlFor={`org-switch-${org.id}`}
                    className="text-sm font-medium"
                  >
                    Emails von <span className="font-bold">{org.name}</span>{" "}
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
                      {isOn ? "On" : "Off"}
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
