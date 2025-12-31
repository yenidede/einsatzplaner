"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export type AlertDialogResult = "success" | "cancel";

export interface AlertDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface AlertDialogState {
  isOpen: boolean;
  options: AlertDialogOptions | null;
  resolve: ((value: AlertDialogResult) => void) | null;
}

// Promise-based AlertDialog hook
export const useAlertDialog = () => {
  const [state, setState] = useState<AlertDialogState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    setState({
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, []);

  // Main function to show the dialog and return a Promise
  const showDialog = useCallback(
    (options: AlertDialogOptions): Promise<AlertDialogResult> => {
      return new Promise<AlertDialogResult>((resolve) => {
        setState({
          isOpen: true,
          options,
          resolve,
        });
      });
    },
    []
  );

  // Handle dialog close with result
  const handleClose = useCallback(
    (result: AlertDialogResult) => {
      if (state.resolve) {
        state.resolve(result);
      }
      cleanup();
    },
    [state.resolve, cleanup]
  );

  // Handle open state change (for when user clicks outside or presses escape)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose("cancel");
      }
    },
    [handleClose]
  );

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (state.resolve) {
        state.resolve("cancel");
      }
    };
  }, [state.resolve]);

  const AlertDialogComponent =
    state.isOpen && state.options ? (
      <AlertDialog open={state.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                state.options.variant === "destructive" ? "text-red-600" : ""
              }
            >
              {state.options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {state.options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose("cancel")}>
              {state.options.cancelText || "Abbrechen"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose("success")}
              className={
                state.options.variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {state.options.confirmText || "Bestätigen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null;

  return {
    showDialog,
    AlertDialogComponent,
  };
};

// Convenience hooks for common dialog types
export const useConfirmDialog = () => {
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const confirm = useCallback(
    (
      title: string,
      description: string,
      confirmText = "Bestätigen",
      cancelText = "Abbrechen"
    ) => {
      return showDialog({
        title,
        description,
        confirmText,
        cancelText,
        variant: "default",
      });
    },
    [showDialog]
  );

  const confirmDestructive = useCallback(
    (
      title: string,
      description: string,
      confirmText = "Löschen",
      cancelText = "Abbrechen"
    ) => {
      return showDialog({
        title,
        description,
        confirmText,
        cancelText,
        variant: "destructive",
      });
    },
    [showDialog]
  );

  return {
    confirm,
    confirmDestructive,
    AlertDialogComponent,
  };
};

// Global alert dialog context for application-wide usage
interface AlertDialogContext {
  showDialog: (options: AlertDialogOptions) => Promise<AlertDialogResult>;
}

const AlertDialogContext = React.createContext<AlertDialogContext | null>(null);

// Provider component to wrap your app
export const AlertDialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  return (
    <AlertDialogContext.Provider value={{ showDialog }}>
      {children}
      {AlertDialogComponent}
    </AlertDialogContext.Provider>
  );
};

// Hook to use the global alert dialog
export const useGlobalAlertDialog = () => {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "useGlobalAlertDialog must be used within an AlertDialogProvider"
    );
  }
  return context;
};

// Convenience hooks for global usage
export const useGlobalConfirmDialog = () => {
  const { showDialog } = useGlobalAlertDialog();

  const confirm = useCallback(
    (
      title: string,
      description: string,
      confirmText = "Bestätigen",
      cancelText = "Abbrechen"
    ) => {
      return showDialog({
        title,
        description,
        confirmText,
        cancelText,
        variant: "default",
      });
    },
    [showDialog]
  );

  const confirmDestructive = useCallback(
    (
      title: string,
      description: string,
      confirmText = "Löschen",
      cancelText = "Abbrechen"
    ) => {
      return showDialog({
        title,
        description,
        confirmText,
        cancelText,
        variant: "destructive",
      });
    },
    [showDialog]
  );

  return {
    confirm,
    confirmDestructive,
  };
};
