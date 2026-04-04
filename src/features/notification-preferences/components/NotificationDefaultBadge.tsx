'use client';

import { Badge } from '@/components/ui/badge';

interface NotificationDefaultBadgeProps {
  source: 'organization' | 'user';
}

export function NotificationDefaultBadge({
  source,
}: NotificationDefaultBadgeProps) {
  if (source === 'organization') {
    return <Badge variant="secondary">Organisation-Standard</Badge>;
  }

  return <Badge variant="outline">Eigene Einstellung</Badge>;
}
