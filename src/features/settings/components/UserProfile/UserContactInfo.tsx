"use client";

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
          <div className="w-4 h-4 relative overflow-hidden">
            <div className="w-3.5 h-2.5 left-[1.33px] top-[2.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
            <div className="w-3.5 h-1 left-[1.33px] top-[4.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
          </div>
          <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
            {email}
          </div>
        </div>
        {phone && (
          <div className="flex justify-start items-center gap-2">
            <div className="w-4 h-4 relative overflow-hidden">
              <div className="w-3.5 h-3.5 left-[1.41px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
            </div>
            <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
              {phone}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
