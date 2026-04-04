'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  onSave: () => void;
  isSaving?: boolean;
  onCancel?: () => void;
  cancelHref?: string;
  disableHorizontalPadding?: boolean;
  cancelLabel?: string;
}

export function PageHeader({
  title,
  onSave,
  isSaving = false,
  onCancel,
  cancelHref,
  disableHorizontalPadding,
  cancelLabel = 'Schließen',
}: PageHeaderProps) {
  const router = useRouter();
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--settings-page-header-height',
        `${element.offsetHeight}px`
      );
    };

    updateHeaderHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight();
    });

    resizeObserver.observe(element);
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
      document.documentElement.style.removeProperty(
        '--settings-page-header-height'
      );
    };
  }, []);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (cancelHref) {
      router.push(cancelHref);
    } else {
      router.push('/');
    }
  };

  return (
    <header
      ref={headerRef}
      className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-40 border-b backdrop-blur"
    >
      <div
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between gap-3 py-3 sm:gap-3 sm:py-4',
          !disableHorizontalPadding && 'px-3 sm:px-6 lg:px-8'
        )}
      >
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="truncate">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            size="sm"
            className="min-h-9 min-w-0 touch-manipulation px-2.5 text-sm sm:min-h-9 sm:px-3"
            type="button"
          >
            {cancelLabel}
            <span className="ml-2 hidden sm:inline">
              <Kbd>ESC</Kbd>
            </span>
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="min-h-9 min-w-0 touch-manipulation px-3 text-sm sm:min-h-9 sm:px-3"
            type="button"
          >
            {isSaving ? 'Speichert...' : 'Speichern'}
            <KbdGroup className="ml-2 hidden sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>S</Kbd>
            </KbdGroup>
          </Button>
        </div>
      </div>
    </header>
  );
}
