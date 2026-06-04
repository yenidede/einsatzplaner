'use client';

import { useState } from 'react';
import { GripVertical, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/form/multi-select';

interface SelectFieldSettingsProps {
  options: string[];
  defaultOption?: string;
  defaultOptions?: string[];
  isMultiSelect?: boolean;
  onChange: (updates: {
    options?: string[];
    defaultOption?: string;
    defaultOptions?: string[];
    isMultiSelect?: boolean;
  }) => void;
  errors: string[];
}

export function SelectFieldSettings({
  options,
  defaultOption,
  defaultOptions = [],
  isMultiSelect = false,
  onChange,
  errors,
}: SelectFieldSettingsProps) {
  const [newOption, setNewOption] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const normalizedNewOption = newOption.trim();
  const newOptionError = normalizedNewOption.includes(',')
    ? 'Auswahloptionen dürfen kein Komma enthalten'
    : options.some(
          (option) =>
            option.trim().toLocaleLowerCase('de-AT') ===
            normalizedNewOption.toLocaleLowerCase('de-AT')
        )
      ? 'Diese Auswahloption ist bereits vorhanden'
      : null;

  const handleAddOption = () => {
    if (normalizedNewOption && !newOptionError) {
      onChange({ options: [...options, normalizedNewOption] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const removedOption = options[index];
    const newOptions = options.filter((_, i) => i !== index);

    const updates: {
      options: string[];
      defaultOption?: string;
      defaultOptions?: string[];
    } = {
      options: newOptions,
    };
    if (defaultOption === removedOption) {
      updates.defaultOption = undefined;
    }
    if (defaultOptions.includes(removedOption)) {
      updates.defaultOptions = defaultOptions.filter(
        (option) => option !== removedOption
      );
    }

    onChange(updates);
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOptions.length) return;

    [newOptions[index], newOptions[targetIndex]] = [
      newOptions[targetIndex],
      newOptions[index],
    ];
    onChange({ options: newOptions });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOptions = [...options];
    const draggedItem = newOptions[draggedIndex];

    newOptions.splice(draggedIndex, 1);
    newOptions.splice(targetIndex, 0, draggedItem);

    onChange({ options: newOptions });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOption();
              }
            }}
            placeholder="Option eingeben..."
            className="flex-1"
          />
          <Button type="button" onClick={handleAddOption}>
            Hinzufügen
          </Button>
        </div>
        {newOptionError && (
          <p className="text-sm text-red-600">{newOptionError}</p>
        )}

        {errors.length > 0 && (
          <div className="flex flex-col gap-1">
            {errors.map((error, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {options.length > 0 && (
          <div className="divide-y rounded-md border border-slate-200">
            {options.map((option, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-2 transition-colors hover:bg-slate-50 ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 cursor-grab text-slate-400 active:cursor-grabbing" />
                <span className="flex-1 text-sm">{option}</span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    onClick={() => handleMoveOption(index, 'up')}
                    disabled={index === 0}
                    title="Nach oben"
                    variant="ghost"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleMoveOption(index, 'down')}
                    disabled={index === options.length - 1}
                    title="Nach unten"
                    variant="ghost"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    title="Löschen"
                    variant="destructive"
                    size="icon"
                    aria-label="Option löschen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isMultiSelect"
          checked={isMultiSelect}
          onCheckedChange={(checked) => {
            const nextIsMultiSelect = checked === true;
            const preservedDefaultOptions =
              defaultOptions.length > 0
                ? defaultOptions
                : defaultOption
                  ? [defaultOption]
                  : [];
            onChange({
              isMultiSelect: nextIsMultiSelect,
              defaultOption: nextIsMultiSelect
                ? undefined
                : preservedDefaultOptions[0],
              defaultOptions: preservedDefaultOptions,
            });
          }}
        />
        <Label htmlFor="isMultiSelect" className="text-sm font-medium">
          Mehrfachauswahl erlauben
        </Label>
      </div>

      {options.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">
            {isMultiSelect
              ? 'Standardoptionen (optional)'
              : 'Standardoption (optional)'}
          </Label>
          <p className="text-muted-foreground text-sm">
            Wird automatisch ausgewählt und gespeichert, sofern Sie sie nicht
            ändern.
          </p>
          {isMultiSelect ? (
            <MultiSelect
              options={options.map((option) => ({
                label: option,
                value: option,
              }))}
              value={defaultOptions}
              onValueChange={(values) => onChange({ defaultOptions: values })}
              placeholder="Keine Vorauswahl"
            />
          ) : (
            <select
              value={defaultOption || ''}
              onChange={(e) =>
                onChange({ defaultOption: e.target.value || undefined })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Keine Vorauswahl</option>
              {options.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
