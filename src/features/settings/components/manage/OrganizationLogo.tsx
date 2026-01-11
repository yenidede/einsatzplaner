'use client';

import { ImagePlus } from 'lucide-react';

interface OrganizationLogoSectionProps {
  name: string;
  logoUrl: string;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
}

export function OrganizationLogoSection({
  name,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
}: OrganizationLogoSectionProps) {
  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch px-4">
      <div className="inline-flex items-center justify-start gap-2">
        <div className="relative flex h-11 w-40 items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} Logo`}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`flex h-11 w-40 items-center justify-center rounded-md bg-slate-200 ${
              logoUrl ? 'hidden' : ''
            }`}
          >
            <div className="text-xl font-semibold text-slate-700">
              {name
                ? name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 3)
                : 'ORG'}
            </div>
          </div>
        </div>
        <div className="inline-flex flex-col items-start justify-center">
          <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-700">
            {name}
          </div>
        </div>
      </div>

      <div className="inline-flex items-start justify-start gap-2">
        <label
          htmlFor="logo-upload"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
        >
          <ImagePlus className="relative h-4 w-4 overflow-hidden" />
          <span>Logo hochladen</span>
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={onLogoUpload}
          className="hidden"
        />

        <button
          type="button"
          onClick={onLogoRemove}
          className="flex items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2 outline outline-1 outline-offset-[-1px] outline-slate-200 transition-colors hover:bg-slate-50"
        >
          <span className="font-['Inter'] text-sm leading-normal font-medium text-slate-900">
            Logo entfernen
          </span>
        </button>
      </div>
    </div>
  );
}
