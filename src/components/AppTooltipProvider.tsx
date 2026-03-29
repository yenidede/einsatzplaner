'use client';

import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Wraps the provided content with a TooltipProvider configured to show tooltips immediately.
 *
 * @param children - Content to be wrapped by the tooltip provider.
 * @returns A React element that renders `children` inside a `TooltipProvider` with `delayDuration` set to 0.
 */
export default function AppTooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
