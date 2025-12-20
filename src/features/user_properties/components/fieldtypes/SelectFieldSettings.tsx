"use client";

import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/SimpleFormComponents";

interface SelectFieldSettingsProps {
  options: string[];
  defaultOption?: string;
  onChange: (updates: { options?: string[]; defaultOption?: string }) => void;
}

export function SelectFieldSettings({
  options,
  defaultOption,
  onChange,
}: SelectFieldSettingsProps) {
  const [newOption, setNewOption] = useState("");

  const handleAddOption = () => {
    if (newOption.trim()) {
      onChange({ options: [...options, newOption.trim()] });
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    const removedOption = options[index];
    const newOptions = options.filter((_, i) => i !== index);

    // Wenn die Standardoption gelöscht wird, zurücksetzen
    const updates: { options: string[]; defaultOption?: string } = {
      options: newOptions,
    };
    if (defaultOption === removedOption) {
      updates.defaultOption = undefined;
    }

    onChange(updates);
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const newOptions = [...options];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[index], newOptions[targetIndex]] = [
      newOptions[targetIndex],
      newOptions[index],
    ];
    onChange({ options: newOptions });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Auswahlmöglichkeiten</Label>

        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddOption();
              }
            }}
            placeholder="Option eingeben..."
            className="flex-1"
          />
          <Button
            onClick={handleAddOption}
            className="px-4 py-2 bg-slate-900 text-white rounded-md"
          >
            Hinzufügen
          </Button>
        </div>

        {options.length > 0 && (
          <div className="border border-slate-200 rounded-md divide-y">
            {options.map((option, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 hover:bg-slate-50"
              >
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                <span className="flex-1 text-sm">{option}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleMoveOption(index, "up")}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveOption(index, "down")}
                    disabled={index === options.length - 1}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                    title="Nach unten"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Löschen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standardoption */}
      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">
            Standardoption (optional)
          </Label>
          <select
            value={defaultOption || ""}
            onChange={(e) =>
              onChange({ defaultOption: e.target.value || undefined })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          >
            <option value="">Keine Vorauswahl</option>
            {options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
