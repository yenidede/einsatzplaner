'use client';

import { useContext, useCallback } from 'react';
import { AlertDialogContext } from '@/contexts/AlertDialogContext';

const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      'useAlertDialog must be used within an AlertDialogContextProvider'
    );
  }
  return {
    showDialog: context.showDialogFromContext,
    AlertDialogComponent: null,
  };
};

export const useConfirmDialog = () => {
  const { showDialog, AlertDialogComponent } = useAlertDialog();

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
    AlertDialogComponent,
  };
};
