'use client';

import { createContext, useState, ReactNode } from 'react';
import { AlertDialogProvider } from '@/components/AlertDialog';

export type AlertDialogOptions = {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
};

export type AlertDialogResult = 'success' | 'cancel';

interface AlertDialogContextValue {
  showDialog: (options: AlertDialogOptions) => Promise<AlertDialogResult>;
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

  const showDialog = (
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
    showDialog,
  };

  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
      <AlertDialogProvider
        isOpen={isOpen}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        setIsOpen={setIsOpen}
      />
    </AlertDialogContext.Provider>
  );
}
