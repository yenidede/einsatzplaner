"use client";

import Image from "next/image";

interface OrganizationPreferencesProps {
  helperSingular: string;
  helperPlural: string;
  onHelperSingularChange: (value: string) => void;
  onHelperPluralChange: (value: string) => void;
}

export function OrganizationPreferences({
  helperSingular,
  helperPlural,
  onHelperSingularChange,
  onHelperPluralChange,
}: OrganizationPreferencesProps) {
  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-2">
      <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
          Präferenzen
        </div>
      </div>
      <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
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
              placeholder="z.B. Vermittler:in, Helfer:in"
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
              placeholder="z.B. Vermittler:innen, Helfer:innen"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
