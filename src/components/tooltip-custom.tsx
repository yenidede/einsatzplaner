import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TooltipCustomProps {
  text: string;
  asChild?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * Narrows a React node to an element that may expose a `disabled` prop.
 */
function isDisabledElement(
  child: React.ReactNode
): child is React.ReactElement<{ disabled?: boolean }> {
  return React.isValidElement<{ disabled?: boolean }>(child);
}

/**
 * Renders a tooltip when `text` is present and keeps disabled triggers reachable.
 */
export default function TooltipCustom({
  children,
  text,
  asChild = true,
  contentClassName,
}: TooltipCustomProps) {
  if (text.trim() === '') {
    return <>{children}</>;
  }

  const shouldWrapDisabledChild =
    asChild && isDisabledElement(children) && children.props.disabled === true;

  const triggerChild = shouldWrapDisabledChild ? (
    <span className="inline-flex w-full" tabIndex={0} aria-disabled="true">
      {children}
    </span>
  ) : (
    children
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{triggerChild}</TooltipTrigger>
      <TooltipContent className={contentClassName}>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
