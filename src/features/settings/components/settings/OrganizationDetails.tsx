'use client';

import { useEffect } from 'react';

import { useOrganizationDetails } from '@/features/organization/hooks/use-organization-queries';
import {
  criticalFieldClass,
  criticalFieldLabel,
} from '@/features/settings/utils/criticalFieldUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Lädt Details...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Website */}
            <div className="space-y-2">
              {criticalFieldLabel('Website', isSuperadmin, false, 'org-website')}
              <Input
                id="org-website"
                type="url"
                value={website}
                onChange={(e) => onWebsiteChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="https://www.beispiel.at"
                className={criticalFieldClass(isSuperadmin)}
                aria-label="Website der Organisation"
                aria-describedby={!isSuperadmin ? 'website-restriction' : undefined}
              />
              {!isSuperadmin && (
                <p id="website-restriction" className="text-muted-foreground text-xs">
                  Nur Superadmins können die Website ändern
                </p>
              )}
            </div>

            {/* UID / Steuernummer */}
            <div className="space-y-2">
              {criticalFieldLabel('UID / Steuernummer', isSuperadmin, false, 'org-vat')}
              <Input
                id="org-vat"
                type="text"
                value={vat}
                onChange={(e) => onVatChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="ATU12345678"
                className={criticalFieldClass(isSuperadmin)}
                aria-label="UID / Steuernummer"
                aria-describedby={!isSuperadmin ? 'vat-restriction' : undefined}
              />
              {!isSuperadmin && (
                <p id="vat-restriction" className="text-muted-foreground text-xs">
                  Nur Superadmins können die UID ändern
                </p>
              )}
            </div>

            {/* ZVR-Nummer */}
            <div className="space-y-2">
              {criticalFieldLabel('ZVR-Nummer', isSuperadmin, false, 'org-zvr')}
              <Input
                id="org-zvr"
                type="text"
                value={zvr}
                onChange={(e) => onZvrChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="123456789"
                className={criticalFieldClass(isSuperadmin)}
                aria-label="ZVR-Nummer"
                aria-describedby={!isSuperadmin ? 'zvr-restriction' : undefined}
              />
              {!isSuperadmin && (
                <p id="zvr-restriction" className="text-muted-foreground text-xs">
                  Nur Superadmins können die ZVR-Nummer ändern
                </p>
              )}
            </div>

            {/* Zuständige Behörde */}
            <div className="space-y-2">
              {criticalFieldLabel('Zuständige Behörde', isSuperadmin, false, 'org-authority')}
              <Input
                id="org-authority"
                type="text"
                value={authority}
                onChange={(e) => onAuthorityChange(e.target.value)}
                disabled={!isSuperadmin}
                placeholder="Magistrat Wien"
                className={criticalFieldClass(isSuperadmin)}
                aria-label="Zuständige Behörde"
                aria-describedby={!isSuperadmin ? 'authority-restriction' : undefined}
              />
              {!isSuperadmin && (
                <p id="authority-restriction" className="text-muted-foreground text-xs">
                  Nur Superadmins können die Behörde ändern
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
