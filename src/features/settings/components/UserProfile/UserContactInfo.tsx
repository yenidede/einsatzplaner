"use client";

import { Mail, Phone } from "lucide-react";

interface UserContactInfoProps {
  email: string;
  phone: string | null;
}

export function UserContactInfo({ email, phone }: UserContactInfoProps) {
  return (
    <div className="px-4 flex flex-col justify-center items-start gap-2.5">
      <div className="w-96 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
          Kontaktinformationen
        </div>
      </div>
      <div className="inline-flex justify-center items-center gap-4">
        <div className="flex justify-start items-center gap-2">
          {/* Email Icon */}
          <Mail className="w-4 h-4 text-slate-600" />
          <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
            {email}
          </div>
        </div>
        {phone && (
          <div className="flex justify-start items-center gap-2">
            {/* Phone Icon */}
            <Phone className="w-4 h-4 text-slate-600" />
            <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
              {phone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
