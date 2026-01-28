import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseSettingsKeyboardShortcutsOptions {
  onSave: () => void;
  onCancel?: () => void;
}

export function useSettingsKeyboardShortcuts({
  onSave,
  onCancel,
}: UseSettingsKeyboardShortcutsOptions) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onCancel) {
          onCancel();
        } else {
          router.push('/');
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onCancel, router]);
}
