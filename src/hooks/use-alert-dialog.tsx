'use client';

import React, { useContext, useCallback } from 'react';
import {
  AlertDialogContext,
  type AlertDialogOptions,
  type AlertDialogResult,
} from '@/contexts/AlertDialogContext';

export type { AlertDialogOptions, AlertDialogResult };

/** Function type for helpers that need to show the dialog (e.g. handleDelete). */
export type ShowDialogFn = (
  options: AlertDialogOptions
) => Promise<AlertDialogResult>;

/**
 * Use the global alert dialog. Must be used within AlertDialogContextProvider.
 * The dialog is rendered once by the provider; AlertDialogComponent is null.
 */
export const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      'useAlertDialog must be used within an AlertDialogContextProvider'
    );
  }
  return {
    showDialog: context.showDialog,
    AlertDialogComponent: null as React.ReactNode,
  };
};

export const useConfirmDialog = () => {
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const showConfirmDialog = useCallback(
    (title: string, description: string) => {
      return showDialog({
        title,
        description,
        variant: 'default',
      });
    },
    [showDialog]
  );

  const showConfirmDestructiveDialog = useCallback(
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
    showConfirmDialog,
    showConfirmDestructiveDialog,
    AlertDialogComponent,
  };
};
