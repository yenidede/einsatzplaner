'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from 'radix-ui';
import Image from 'next/image';

import { cn } from '@/lib/utils';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  alt,
}: React.ComponentProps<typeof AvatarPrimitive.Image> & {
  src: string | null | undefined;
  alt: string;
}) {
  if (!src || src === '') return null;

  return (
    <Image
      src={src}
      alt={alt || 'Avatar'}
      fill
      sizes={'128, 256'}
      className={cn('size-full object-cover', className)}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'bg-secondary flex size-full items-center justify-center rounded-[inherit] text-xs',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
