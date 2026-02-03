'use client';

import { useCallback } from 'react';
import { Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import TooltipCustom from '@/components/tooltip-custom';

const COPY_TOOLTIP_TEXT = 'In Zwischenablage kopieren';

interface UserContactInfoProps {
  email: string;
  phone: string | null;
}

function CopyableContactItem({
  value,
  icon: Icon,
  label,
}: {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('In Zwischenablage kopiert');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  }, [value]);

  return (
    <TooltipCustom text={COPY_TOOLTIP_TEXT}>
      <button
        type="button"
        onClick={handleCopy}
        className="hover:bg-muted focus-visible:ring-ring flex cursor-pointer items-center justify-start gap-2 rounded-md px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline"
        aria-label={`${label} in Zwischenablage kopieren`}
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-600" />
        <span className="font-['Inter'] text-base leading-normal font-normal text-slate-800">
          {value}
        </span>
      </button>
    </TooltipCustom>
  );
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
        <CopyableContactItem value={email} icon={Mail} label="E-Mail" />
        {phone && (
          <CopyableContactItem value={phone} icon={Phone} label="Telefon" />
        )}
      </div>
    </div>
  );
}
