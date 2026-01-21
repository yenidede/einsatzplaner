'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  criticalFieldLabel,
  criticalFieldClass,
} from '@/features/settings/utils/criticalFieldUtils';
import { Label } from '../ui/label';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { Button } from '@/components/ui/button';

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
    <>
      <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
        <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
          <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
            placeholder="Organisationsname"
          />
        </div>
      </div>

      <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
        <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
          {criticalFieldLabel('E-Mail', isSuperadmin)}
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={!isSuperadmin}
            className={criticalFieldClass(isSuperadmin)}
            placeholder="organisation@example.com"
          />
        </div>
        <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
          <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
            placeholder="+43 123 456789"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="allow-self-signout"
            name="allow-self-signout"
            checked={allowSelfSignOut}
            onCheckedChange={(checked) =>
              onAllowSelfSignOutChange(checked === true)
            }
          />
          <Label
            htmlFor="allow-self-signout"
            className="cursor-pointer font-medium text-slate-800"
          >
            {helper_plural} können sich selbst austragen
          </Label>
        </div>
        <p className="ml-6 text-sm text-slate-600">
          Wenn aktiviert, können sich {helper_plural} selbstständig aus{' '}
          {einsatz_plural} austragen, für die sie sich eingetragen haben.
        </p>
      </div>

      <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
        <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
          <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
            Beschreibung
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="h-20 w-full resize-none rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
            placeholder="Beschreibung der Organisation"
          />
        </div>
      </div>
      <Button onClick={onSave} className="mx-4 mt-4">
        Änderungen speichern
      </Button>
    </>
  );
}
