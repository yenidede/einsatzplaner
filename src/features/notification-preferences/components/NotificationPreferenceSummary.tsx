'use client';

import { cn } from '@/lib/utils';

interface NotificationPreferenceSummaryProps {
  summary: string;
  className?: string;
}

export function NotificationPreferenceSummary({
  summary,
  className,
}: NotificationPreferenceSummaryProps) {
  return (
    <p className={cn('text-muted-foreground text-sm', className)} title={summary}>
      {summary}
    </p>
  );
}
