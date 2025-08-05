import React from "react";
import { Toggle } from "@/components/ui/toggle";
import Image from "next/image";

type ToggleItemBigProps = {
  text: string;
  onClick: () => void;
  description?: string;
  className?: string;
  iconUrl?: string | null;
};

export default function ToggleItemBig({
  onClick,
  text,
  description,
  iconUrl,
  className,
}: ToggleItemBigProps) {
  return (
    <Toggle
      size="xl"
      variant="outline"
      onClick={onClick}
      className={"flex flex-col items-center justify-center gap-0 " + className}
    >
      {iconUrl && (
        <Image
          className="mb-2"
          src={iconUrl}
          alt={`${text} icon`}
          width={20}
          height={20}
          loading="lazy"
          unoptimized // svgs are already optimized
        />
      )}
      <div className="font-medium">{text}</div>
      <div className="text-slate-600 text-xs">{description}</div>
    </Toggle>
  );
}
