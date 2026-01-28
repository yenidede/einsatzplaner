'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  criticalFieldLabel,
  criticalFieldClass,
} from '@/features/settings/utils/criticalFieldUtils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrganizationDetailsFormProps {
  name: string;
  email: string;
  allowSelfSignOut: boolean;
  phone: string;
  description: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAllowSelfSignOutChange: (value: boolean) => void;
  onSave: () => void;
  isSuperadmin?: boolean;
}

export function OrganizationDetailsForm({
  name,
  email,
  phone,
  description,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onDescriptionChange,
  allowSelfSignOut,
  onAllowSelfSignOutChange,
  isSuperadmin = false,
  onSave,
}: OrganizationDetailsFormProps) {
  const { data: session } = useSession();
  const { data: organizations } = useOrganizations(
    session?.user?.orgIds ?? undefined
  );

  const { helper_plural, einsatz_plural } = useOrganizationTerminology(
    organizations,
    session?.user.activeOrganization?.id
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="org-name">Name</Label>
        <Input
          id="org-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Organisationsname"
          aria-label="Organisationsname"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {criticalFieldLabel('E-Mail', isSuperadmin, false, 'org-email')}
          <Input
            id="org-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={!isSuperadmin}
            className={criticalFieldClass(isSuperadmin)}
            placeholder="organisation@example.com"
            aria-label="E-Mail-Adresse der Organisation"
            aria-describedby={!isSuperadmin ? 'email-restriction' : undefined}
          />
          {!isSuperadmin && (
            <p id="email-restriction" className="text-muted-foreground text-xs">
              Nur Superadmins können die E-Mail ändern
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-phone">Telefon</Label>
          <Input
            id="org-phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+43 123 456789"
            aria-label="Telefonnummer der Organisation"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="allow-self-signout"
            checked={allowSelfSignOut}
            onCheckedChange={(checked) =>
              onAllowSelfSignOutChange(checked === true)
            }
            aria-label={`${helper_plural} können sich selbst austragen`}
          />
          <Label
            htmlFor="allow-self-signout"
            className="cursor-pointer font-medium"
          >
            {helper_plural} können sich selbst austragen
          </Label>
        </div>
        <p className="text-muted-foreground ml-6 text-sm">
          Wenn aktiviert, können sich {helper_plural} selbstständig aus{' '}
          {einsatz_plural} austragen, für die sie sich eingetragen haben.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-description">Beschreibung</Label>
        <Textarea
          id="org-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Beschreibung der Organisation"
          aria-label="Beschreibung der Organisation"
          rows={4}
        />
      </div>
    </div>
  );
}
