"use client";

interface OrganizationDetailsFormProps {
  name: string;
  email: string;
  phone: string;
  description: string;
  helperSingular: string;
  helperPlural: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onHelperSingularChange: (value: string) => void;
  onHelperPluralChange: (value: string) => void;
}

export function OrganizationDetailsForm({
  name,
  email,
  phone,
  description,
  helperSingular,
  helperPlural,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onDescriptionChange,
  onHelperSingularChange,
  onHelperPluralChange,
}: OrganizationDetailsFormProps) {
  return (
    <>
      <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 focus:outline-blue-500"
            placeholder="Organisationsname"
          />
        </div>
      </div>

      <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 focus:outline-blue-500"
            placeholder="organisation@example.com"
          />
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 focus:outline-blue-500"
            placeholder="+43 123 456789"
          />
        </div>
      </div>

      <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            Beschreibung
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 resize-none focus:outline-blue-500"
            placeholder="Beschreibung der Organisation"
          />
        </div>
      </div>

      <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            Helfer (Singular)
          </label>
          <input
            type="text"
            value={helperSingular}
            onChange={(e) => onHelperSingularChange(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 focus:outline-blue-500"
            placeholder="Helfer:in"
          />
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
          <label className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
            Helfer (Plural)
          </label>
          <input
            type="text"
            value={helperPlural}
            onChange={(e) => onHelperPluralChange(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 focus:outline-blue-500"
            placeholder="Helfer:innen"
          />
        </div>
      </div>
    </>
  );
}
