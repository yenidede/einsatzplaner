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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1>{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            Abbrechen
            <span className="ml-2 hidden sm:inline">
              <Kbd>ESC</Kbd>
            </span>
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
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
