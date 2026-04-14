'use client';

import { cn } from '@/lib/utils';

interface NotificationPreferenceSummaryProps {
  explanation: string;
  className?: string;
}

export function NotificationPreferenceSummary({
  explanation,
  className,
}: NotificationPreferenceSummaryProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <p
        className="text-muted-foreground text-sm whitespace-pre-line"
        title={explanation}
      >
        {explanation}
      </p>
    </div>
  );
}
