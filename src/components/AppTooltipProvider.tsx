'use client';

import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Provides app-wide tooltip behavior with no show delay.
 */
export default function AppTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
