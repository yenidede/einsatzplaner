'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

interface PageHeaderProps {
  title: string;
  description?: string;
  onSave: () => void;
  isSaving?: boolean;
  onCancel?: () => void;
  cancelHref?: string;
}

export function PageHeader({
  title,
  description,
  onSave,
  isSaving = false,
  onCancel,
  cancelHref,
}: PageHeaderProps) {
  const router = useRouter();

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
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-0.5 hidden truncate text-sm sm:block">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            size="sm"
            className="min-h-10 min-w-11 touch-manipulation sm:min-h-9"
            type="button"
          >
            Schließen
            <span className="ml-2 hidden sm:inline">
              <Kbd>ESC</Kbd>
            </span>
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="min-h-10 min-w-11 touch-manipulation sm:min-h-9"
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
