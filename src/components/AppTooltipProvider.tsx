'use client';

import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
