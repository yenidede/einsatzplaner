'use client';

import {
  criticalFieldLabel,
  criticalFieldClass,
} from '@/features/settings/utils/criticalFieldUtils';
import { Input } from '@/components/ui/input';
import { OrganizationAddresses } from '@/components/settings/org/OrganizationAddresses';
import { OrganizationBankAccounts } from '@/components/settings/org/OrganizationBankAccounts';

interface OrganizationPdfExportFormProps {
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

export function OrganizationPdfExportForm({
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
}: OrganizationPdfExportFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <p
              id="website-restriction"
              className="text-muted-foreground text-xs"
            >
              Nur Superadmins können die Website ändern
            </p>
          )}
        </div>

        <div className="space-y-2">
          {criticalFieldLabel(
            'UID / Steuernummer',
            isSuperadmin,
            false,
            'org-vat'
          )}
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

        <div className="space-y-2">
          {criticalFieldLabel(
            'Zuständige Behörde',
            isSuperadmin,
            false,
            'org-authority'
          )}
          <Input
            id="org-authority"
            type="text"
            value={authority}
            onChange={(e) => onAuthorityChange(e.target.value)}
            disabled={!isSuperadmin}
            placeholder="Magistrat Wien"
            className={criticalFieldClass(isSuperadmin)}
            aria-label="Zuständige Behörde"
            aria-describedby={
              !isSuperadmin ? 'authority-restriction' : undefined
            }
          />
          {!isSuperadmin && (
            <p
              id="authority-restriction"
              className="text-muted-foreground text-xs"
            >
              Nur Superadmins können dieses Feld ändern
            </p>
          )}
        </div>
      </div>

      <OrganizationAddresses
        organizationId={organizationId}
        isSuperadmin={isSuperadmin}
        onSave={onSave}
      />

      <OrganizationBankAccounts
        organizationId={organizationId}
        isSuperadmin={isSuperadmin}
        onSave={onSave}
      />
    </div>
  );
}
