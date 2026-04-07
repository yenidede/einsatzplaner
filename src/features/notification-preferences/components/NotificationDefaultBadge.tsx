'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NotificationDefaultBadgeProps {
  source: 'organization' | 'user';
  className?: string;
}

export function NotificationDefaultBadge({
  source,
  className,
}: NotificationDefaultBadgeProps) {
  if (source === 'organization') {
    return (
      <Badge variant="secondary" className={cn('text-[11px]', className)}>
        Organisationsstandard
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-[11px]', className)}>
      Eigene Einstellung
    </Badge>
  );
}
