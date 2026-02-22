import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface AlertDialogProviderProps {
  isOpen: boolean;
  options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
  setIsOpen: (open: boolean) => void;
}

export function AlertDialogProvider({
  isOpen,
  options,
  onConfirm,
  onCancel,
  setIsOpen,
}: AlertDialogProviderProps) {
  if (!options) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={options.variant === 'destructive' ? 'text-red-600' : ''}
          >
            {options.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {options.cancelText ?? 'Abbrechen'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              options.variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }
          >
            {options.confirmText ?? 'Bestätigen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
