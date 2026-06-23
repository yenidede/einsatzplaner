'use client';

import { useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AlertDialogContext } from '@/contexts/AlertDialogContext';

type DialogButtonTexts = {
  confirmText: string;
  cancelText: string;
};

// interne Verwendung des shadcn Alert-Dialogs
const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within an AlertDialogContextProvider'
    );
  }
  return {
    showDialog: context.showDialogFromContext,
  };
};

export const useConfirmDialog = () => {
  const { showDialog } = useAlertDialog();

  const showDefault = useCallback(
    (title: string, description: ReactNode, options: DialogButtonTexts) => {
      return showDialog({
        title,
        description,
        variant: 'default',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
      });
    },
    [showDialog]
  );

  const showDestructive = useCallback(
    (title: string, description: ReactNode, options: DialogButtonTexts) => {
      return showDialog({
        title,
        description,
        variant: 'destructive',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
      });
    },
    [showDialog]
  );

  return {
    showDefault,
    showDestructive,
  };
};
