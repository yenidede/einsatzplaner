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
 * Determines whether a React node is a React element that may have a `disabled` prop.
 *
 * @param child - The React node to test
 * @returns `true` if `child` is a React element that can have a `disabled?: boolean` prop, `false` otherwise.
 */
function isDisabledElement(
  child: React.ReactNode
): child is React.ReactElement<{ disabled?: boolean }> {
  return React.isValidElement<{ disabled?: boolean }>(child);
}

/**
 * Render a tooltip around the provided children when `text` contains non-whitespace characters.
 *
 * If `text` is empty or only whitespace, returns `children` unchanged. When `asChild` is true and the
 * child is a React element with `disabled === true`, the child is wrapped in a `<span className="inline-flex">`
 * so a `TooltipTrigger` can attach to it. `contentClassName` is forwarded to the `TooltipContent`.
 *
 * @param children - Element that will act as the tooltip trigger
 * @param text - Tooltip text; if empty or whitespace, the children are returned unchanged
 * @param asChild - When true, passes `asChild` to `TooltipTrigger` so the children replace the trigger element
 * @param contentClassName - Optional class name applied to the `TooltipContent` container
 * @returns The tooltip-wrapped trigger with content when `text` is non-empty, otherwise the original children
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

  if (text === '') {
    return children;
  }

  const shouldWrapDisabledChild =
    asChild && isDisabledElement(children) && children.props.disabled === true;

  const triggerChild = shouldWrapDisabledChild ? (
    <span className="inline-flex">{children}</span>
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
