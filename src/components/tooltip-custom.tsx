import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipCustomProps {
  text: string;
  asChild?: boolean;
  children: React.ReactNode;
}

export default function TooltipCustom({
  children,
  text,
  asChild = true,
}: TooltipCustomProps) {
  if (text.trim() === "") {
    return <>{children}</>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
