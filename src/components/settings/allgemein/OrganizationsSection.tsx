'use client';

import OrganizationCard from '@/components/settings/OrganizationCard';
import CalendarSubscription from '@/features/calendar-subscription/components/CalendarSubscriptionClient';
import { Organization } from '../../../features/settings/types';

interface OrganizationsSectionProps {
  organizations: Organization[];
  onOrganizationLeave: (orgId: string) => void;
}

export function OrganizationsSection({
  organizations,
  onOrganizationLeave,
}: OrganizationsSectionProps) {
  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="inline-flex items-center justify-between self-stretch border-b border-slate-200 px-4 py-2">
        <div className="flex flex-1 items-center justify-start gap-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
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
        <div className="px-4 py-2 text-slate-500">
          Sie sind noch keiner Organisation zugeordnet.
        </div>
      )}
    </div>
  );
}
