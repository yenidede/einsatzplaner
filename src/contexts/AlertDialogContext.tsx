"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AlertDialogProvider } from "@/components/AlertDialog";

type AlertDialogOptions = {
  title: string;
  description: string;
};

interface AlertDialogContextValue {
  showDialog: (options: AlertDialogOptions) => Promise<"success" | "cancel">;
}

const AlertDialogContext = createContext<AlertDialogContextValue | undefined>(
  undefined
);

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "useAlertDialog must be used within an AlertDialogContextProvider"
    );
  }
  return context;
}

interface AlertDialogContextProviderProps {
  children: ReactNode;
}

export function AlertDialogContextProvider({
  children,
}: AlertDialogContextProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertDialogOptions | null>(null);
  const [resolver, setResolver] = useState<
    ((value: "success" | "cancel") => void) | null
  >(null);

  const showDialog = (
    dialogOptions: AlertDialogOptions
  ): Promise<"success" | "cancel"> => {
    setOptions(dialogOptions);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    resolver?.("success");
    setResolver(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver?.("cancel");
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
