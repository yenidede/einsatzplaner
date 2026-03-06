'use client';

import { useContext, useCallback } from 'react';
import { AlertDialogContext } from '@/contexts/AlertDialogContext';

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
    (title: string, description: string) => {
      return showDialog({
        title,
        description,
        variant: 'default',
      });
    },
    [showDialog]
  );

  const showDestructive = useCallback(
    (title: string, description: string) => {
      return showDialog({
        title,
        description,
        variant: 'destructive',
      });
    },
    [showDialog]
  );

  return {
    showDefault,
    showDestructive,
  };
};
