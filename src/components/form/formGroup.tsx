import React from 'react';

const isTitleActive = false;

export default function FormGroup({
  title,
  className,
  children,
}: {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      {isTitleActive && title && (
        <div className="col-span-full text-sm leading-tight font-semibold">
          {title}
        </div>
      )}
      <div
        className={
          (className ?? 'grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]') +
          ' gap-4'
        }
      >
        {children}
      </div>
    </div>
  );
}
