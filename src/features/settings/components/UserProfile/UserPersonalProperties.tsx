"use client";

import SwitchIcon from "@/components/icon/SwitchIcon";

interface UserPersonalPropertiesProps {
  organizationName: string;
  hasKey: boolean;
  onToggleKey: () => void;
  description: string | null;
}

export function UserPersonalProperties({
  organizationName,
  hasKey,
  onToggleKey,
  description,
}: UserPersonalPropertiesProps) {
  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-start items-center gap-2">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Personeneigenschaften
          </div>
          <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
              Person hat Schlüssel?
            </div>
            <button
              onClick={onToggleKey}
              className="cursor-pointer disabled:opacity-50 transition-opacity bg-transparent 
              border-0 p-0 outline-none focus:outline-none hover:bg-transparent click:bg-transparent"
            >
              <SwitchIcon isOn={hasKey} disabled={false} />
            </button>
          </div>
        </div>
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none">
                Anmerkung
              </div>
              <textarea
                className="w-full h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 resize-none"
                placeholder="Anmerkung hier eingeben"
                value={description || ""}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
