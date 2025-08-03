import { useState } from "react";

type AlertDialogOptions = {
  title: string;
  description: string;
};

export function useAlertDialog() {
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

  return {
    isOpen,
    options,
    showDialog,
    handleConfirm,
    handleCancel,
    setIsOpen,
  };
}
