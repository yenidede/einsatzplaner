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
    <div className="flex min-w-0 flex-col gap-2">
      <p
        className={cn(
          'text-muted-foreground text-sm whitespace-pre-line',
          className
        )}
        title={explanation}
      >
        {explanation}
      </p>
    </div>
  );
}
