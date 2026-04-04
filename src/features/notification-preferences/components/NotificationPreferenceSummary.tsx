'use client';

interface NotificationPreferenceSummaryProps {
  summary: string;
}

export function NotificationPreferenceSummary({
  summary,
}: NotificationPreferenceSummaryProps) {
  return <p className="text-muted-foreground text-sm">{summary}</p>;
}
