import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseSettingsKeyboardShortcutsOptions {
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  enabled?: boolean;
}

export function useSettingsKeyboardShortcuts({
  onSave,
  onCancel,
  enabled = true,
}: UseSettingsKeyboardShortcutsOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onCancel) {
          onCancel();
        } else {
          router.push('/');
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();

        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement &&
          activeElement.dataset.timeInput === 'true'
        ) {
          activeElement.blur();
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        await onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSave, onCancel, router]);
}
