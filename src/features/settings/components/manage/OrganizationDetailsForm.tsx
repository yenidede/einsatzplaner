'use client';
import {
  criticalFieldLabel,
  criticalFieldClass,
} from '../../utils/criticalFieldUtils';

interface OrganizationDetailsFormProps {
  name: string;
  email: string;
  phone: string;
  description: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
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
  isSuperadmin = false,
}: OrganizationDetailsFormProps) {
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
    </>
  );
}
