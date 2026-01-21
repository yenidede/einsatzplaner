'use client';

import { useEffect } from 'react';

import { useOrganizationDetails } from '@/features/organization/hooks/use-organization-queries';
import {
  criticalFieldClass,
  criticalFieldLabel,
} from '@/features/settings/utils/criticalFieldUtils';
import { Button } from '@/components/ui/button';

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
  onSave: () => void;
  isSuperadmin?: boolean;
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
  isSuperadmin = false,
  onSave,
}: OrganizationDetailsProps) {
  const { data: details, isLoading } = useOrganizationDetails(organizationId);

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
          <div className="text-sm font-semibold text-slate-900">
            Weitere Organisationsdetails (PDF-Export)
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 self-stretch border-t border-slate-200 px-4 py-4">
        {isLoading ? (
          <div className="text-sm text-slate-500">Lädt Details...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Website */}
            <div className="flex flex-col gap-1.5">
              {criticalFieldLabel('Website', isSuperadmin)}
              <input
                type="url"
                value={website}
                onChange={(e) => onWebsiteChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="https://www.beispiel.at"
                className={criticalFieldClass(isSuperadmin)}
                title={
                  !isSuperadmin
                    ? 'Nur Superadmins können die Website ändern'
                    : ''
                }
              />
            </div>

            {/* UID / Steuernummer */}
            <div className="flex flex-col gap-1.5">
              {criticalFieldLabel('UID / Steuernummer', isSuperadmin)}
              <input
                type="text"
                value={vat}
                onChange={(e) => onVatChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="ATU12345678"
                className={criticalFieldClass(isSuperadmin)}
                title={
                  !isSuperadmin ? 'Nur Superadmins können die UID ändern' : ''
                }
              />
            </div>

            {/* ZVR-Nummer */}
            <div className="flex flex-col gap-1.5">
              {criticalFieldLabel('ZVR-Nummer', isSuperadmin)}
              <input
                type="text"
                value={zvr}
                onChange={(e) => onZvrChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="123456789"
                className={criticalFieldClass(isSuperadmin)}
                title={
                  !isSuperadmin
                    ? 'Nur Superadmins können die ZVR-Nummer ändern'
                    : ''
                }
              />
            </div>

            {/* Zuständige Behörde */}
            <div className="flex flex-col gap-1.5">
              {criticalFieldLabel('Zuständige Behörde', isSuperadmin)}
              <input
                type="text"
                value={authority}
                onChange={(e) => onAuthorityChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="Magistrat Wien"
                className={criticalFieldClass(isSuperadmin)}
                title={
                  !isSuperadmin
                    ? 'Nur Superadmins können die Behörde ändern'
                    : ''
                }
              />
            </div>
          </div>
        )}
        {isSuperadmin && (
          <div>
            <Button onClick={onSave} className="mt-4">
              Änderungen speichern
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
