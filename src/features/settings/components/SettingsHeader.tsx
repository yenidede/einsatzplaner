"use client";

import Link from "next/link";
import { useEffect } from "react";

interface SettingsHeaderProps {
  onSave: () => void;
  isSaving?: boolean;
  cancelHref?: string;
  onCancel?: () => void;
}

export function SettingsHeader({
  onSave,
  isSaving = false,
  cancelHref = "/settings",
  onCancel,
}: SettingsHeaderProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCancel]);

  return (
    <div className="w-full p-4 border-b border-slate-200 flex justify-between items-center gap-8">
      <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
        <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">
          Einstellungen
        </div>
      </div>
      <div className="flex justify-end items-center gap-2">
        {onCancel ? (
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-white rounded-md outline outline-offset-1 outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-slate-50 transition-colors"
          >
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Abbrechen (ESC)
            </div>
          </button>
        ) : (
          <Link
            href={cancelHref}
            className="px-3 py-1 bg-white rounded-md outline outline-offset-1 outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-slate-50 transition-colors"
          >
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Abbrechen (ESC)
            </div>
          </Link>
        )}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
            {isSaving ? "Speichert..." : "Speichern"}
          </div>
        </button>
      </div>
    </div>
  );
}
