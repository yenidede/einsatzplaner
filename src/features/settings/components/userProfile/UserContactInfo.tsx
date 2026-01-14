'use client';

import { Mail, Phone } from 'lucide-react';

interface UserContactInfoProps {
  email: string;
  phone: string | null;
}

export function UserContactInfo({ email, phone }: UserContactInfoProps) {
  return (
    <div className="flex flex-col items-start justify-center gap-2.5 px-4">
      <div className="inline-flex w-96 items-center justify-start gap-2.5">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
          Kontaktinformationen
        </div>
      </div>
      <div className="inline-flex items-center justify-center gap-4">
        <div className="flex items-center justify-start gap-2">
          {/* Email Icon */}
          <Mail className="h-4 w-4 text-slate-600" />
          <div className="justify-start font-['Inter'] text-base leading-normal font-normal text-slate-800">
            {email}

          </div>
        </div>
        {phone && (
          <div className="flex items-center justify-start gap-2">
            {/* Phone Icon */}
            <Phone className="h-4 w-4 text-slate-600" />
            <div className="justify-start font-['Inter'] text-base leading-normal font-normal text-slate-800">
              {phone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
