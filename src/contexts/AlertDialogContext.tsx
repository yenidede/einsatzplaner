'use client';

import { createContext, useState, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type AlertDialogOptions = {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  confirmText?: string;
  cancelText?: string;
};

export type AlertDialogResult = 'success' | 'cancel';

interface AlertDialogContextValue {
  showDialogFromContext: (
    options: AlertDialogOptions
  ) => Promise<AlertDialogResult>;
}

/** Exported for use in use-alert-dialog only. Do not use useContext directly. */
export const AlertDialogContext = createContext<
  AlertDialogContextValue | undefined
>(undefined);

interface AlertDialogContextProviderProps {
  children: ReactNode;
}

export function AlertDialogContextProvider({
  children,
}: AlertDialogContextProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertDialogOptions | null>(null);
  const [resolver, setResolver] = useState<
    ((value: AlertDialogResult) => void) | null
  >(null);

  const showDialogFromContext = (
    dialogOptions: AlertDialogOptions
  ): Promise<AlertDialogResult> => {
    setOptions(dialogOptions);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolver?.('success');
    setResolver(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver?.('cancel');
    setResolver(null);
  };

  const contextValue: AlertDialogContextValue = {
    showDialogFromContext,
  };

  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
      {options != null && (
        <AlertDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle
                className={
                  options.variant === 'destructive' ? 'text-red-600' : ''
                }
              >
                {options.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                {options.cancelText ?? 'Abbrechen'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                variant={options.variant ?? 'default'}
              >
                {options.confirmText ?? 'Bestätigen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AlertDialogContext.Provider>
  );
}
