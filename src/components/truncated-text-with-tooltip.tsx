'use client';

import TooltipCustom from '@/components/tooltip-custom';
import { cn } from '@/lib/utils';

type TruncatedTextWithTooltipProps = {
  text: string;
  maxChars: number;
  className?: string;
};

export function TruncatedTextWithTooltip({
  text,
  maxChars,
  className,
}: TruncatedTextWithTooltipProps) {
  const isTruncated = text.length > maxChars;

  const content = (
    <span className={cn('block truncate', className)}>
      {text}
    </span>
  );

  return isTruncated ? (
    <TooltipCustom text={text}>{content}</TooltipCustom>
  ) : (
    content
  );
}
