'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface SettingsHeaderProps {
  onSave: () => void;
  isSaving?: boolean;
  cancelHref?: string;
  onCancel?: () => void;
}

export function SettingsHeader({
  onSave,
  isSaving = false,
  cancelHref = '/settings',
  onCancel,
}: SettingsHeaderProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCancel]);

  return (
    <div className="flex w-full items-center justify-between gap-8 border-b border-slate-200 bg-white p-4">
      <div className="flex h-8 flex-1 items-center justify-center gap-2.5">
        <div className="flex-1 justify-start font-['Inter'] text-2xl leading-loose font-semibold text-slate-800">
          Einstellungen
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <button
            onClick={handleCancel}
            className="flex items-center justify-center gap-2.5 rounded-md bg-white px-3 py-1 outline outline-offset-1 outline-slate-200 transition-colors hover:bg-slate-50"
          >
            <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
              Abbrechen (ESC)
            </div>
          </button>
        ) : (
          <Link
            href={cancelHref}
            className="flex items-center justify-center gap-2.5 rounded-md bg-white px-3 py-1 outline outline-offset-1 outline-slate-200 transition-colors hover:bg-slate-50"
          >
            <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
              Abbrechen (ESC)
            </div>
          </Link>
        )}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2.5 rounded-md bg-slate-900 px-3 py-1 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-white">
            {isSaving ? 'Speichert...' : 'Speichern'}
          </div>
        </button>
      </div>
    </div>
  );
}
