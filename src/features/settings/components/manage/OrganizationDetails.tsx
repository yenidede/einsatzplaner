'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { getOrganizationDetailsAction } from '../../organization-action';
import { settingsQueryKeys } from '../../queryKeys/queryKey';

interface OrganizationDetailsProps {
  organizationId: string;
  website: string;
  vat: string;
  zvr: string;
  authority: string;
  onWebsiteChange: (value: string) => void;
  onVatChange: (value: string) => void;
  onZvrChange: (value: string) => void;
  onAuthorityChange: (value: string) => void;
}

export function OrganizationDetails({
  organizationId,
  website,
  vat,
  zvr,
  authority,
  onWebsiteChange,
  onVatChange,
  onZvrChange,
  onAuthorityChange,
}: OrganizationDetailsProps) {
  const { data: details, isLoading } = useQuery({
    queryKey: settingsQueryKeys.orgDetails(organizationId),
    queryFn: () => getOrganizationDetailsAction(organizationId),
    enabled: !!organizationId,
  });

  // Formular mit geladenen Daten befüllen
  useEffect(() => {
    if (details) {
      onWebsiteChange(details.website || '');
      onVatChange(details.vat || '');
      onZvrChange(details.zvr || '');
      onAuthorityChange(details.authority || '');
    }
  }, [details]);

  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="flex items-center justify-between self-stretch px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-700" />
          <div className="font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Weitere Details
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 self-stretch px-4 py-2">
        {isLoading ? (
          <div className="text-sm text-slate-500">Lädt Details...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => onWebsiteChange(e.target.value)}
                placeholder="https://www.beispiel.at"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                UID / Steuernummer
              </label>
              <input
                type="text"
                value={vat}
                onChange={(e) => onVatChange(e.target.value)}
                placeholder="ATU12345678"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Zentrales Vereinsregister
              </label>
              <input
                type="text"
                value={zvr}
                onChange={(e) => onZvrChange(e.target.value)}
                placeholder="123456789"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Zuständige Behörde
              </label>
              <input
                type="text"
                value={authority}
                onChange={(e) => onAuthorityChange(e.target.value)}
                placeholder="Magistrat der Stadt Wien"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
