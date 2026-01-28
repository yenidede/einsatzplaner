'use client';

import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ManagedOrgLinkProps {
  org: { id: string; name: string };
}

export function ManagedOrgLink({ org }: ManagedOrgLinkProps) {
  return (
    <Link
      href={`/organization/${org.id}/manage`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
      )}
    >
      <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
      <span className="truncate">{org.name}</span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-0 transition-transform group-hover:opacity-50" />
    </Link>
  );
}
