"use client";

import OrganizationCard from "@/features/settings/components/OrganizationCard";
import CalendarSubscription from "@/features/calendar-subscription/components/CalendarSubscriptionClient";
import { Organization } from "../../types";

interface OrganizationsSectionProps {
  organizations: Organization[];
  onOrganizationLeave: (orgId: string) => void;
}

export function OrganizationsSection({
  organizations,
  onOrganizationLeave,
}: OrganizationsSectionProps) {
  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Meine Organisationen
          </div>
        </div>
      </div>

      {organizations.length > 0 ? (
        organizations.map((org) => (
          <div key={org.id}>
            <OrganizationCard
              name={org.name}
              roles={org.roles || []}
              onLeave={() => onOrganizationLeave(org.id)}
            />
            <CalendarSubscription
              orgId={org.id}
              orgName={org.name}
              variant="card"
            />
          </div>
        ))
      ) : (
        <div className="text-slate-500 px-4 py-2">
          Du bist in keiner Organisation.
        </div>
      )}
    </div>
  );
}
