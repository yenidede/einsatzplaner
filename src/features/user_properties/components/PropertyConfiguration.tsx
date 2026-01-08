'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/SimpleFormComponents';
import FormInputFieldCustom from '@/components/form/formInputFieldCustom';
import { Input } from '@/components/ui/input';
import type { PropertyConfig, ValidationError } from '../types';
import { UsageSettings } from './UsageSettings';
import { TextFieldSettings } from './fieldtypes/TextFieldSettings';
import { NumberFieldSettings } from './fieldtypes/NumberFieldSettings';
import { BooleanFieldSettings } from './fieldtypes/BooleanFieldSettings';
import { SelectFieldSettings } from './fieldtypes/SelectFieldSettings';
import {
  validatePropertyConfig,
  getRequiredFieldWarning,
} from '../utils/validation';

interface PropertyConfigurationProps {
  config: PropertyConfig;
  onConfigChange: (updates: Partial<PropertyConfig>) => void;
  onSave: () => void;
  onCancel: () => void;
  existingPropertyNames?: string[];
  existingUserCount?: number;
}

export function PropertyConfiguration({
  config,
  onConfigChange,
  onSave,
  onCancel,
  existingPropertyNames = [],
  existingUserCount = 0,
}: PropertyConfigurationProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const validationErrors = validatePropertyConfig(
      config,
      existingPropertyNames
    );
    setErrors(validationErrors);
  }, [config, existingPropertyNames]);

  const handleSave = () => {
    const validationErrors = validatePropertyConfig(
      config,
      existingPropertyNames
    );
    if (validationErrors.length === 0) {
      onSave();
    } else {
      setErrors(validationErrors);
    }
  };

  const warningMessage = getRequiredFieldWarning(
    config.isRequired,
    existingUserCount
  );

  const getFieldError = (fieldName: string): string[] => {
    return errors.filter((e) => e.field === fieldName).map((e) => e.message);
  };

  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Neue Eigenschaft konfigurieren
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-6 self-stretch border-t border-slate-200 py-4">
        <div className="flex flex-col gap-4 self-stretch px-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Grundinformationen
          </h3>

          <FormInputFieldCustom
            name="Name der Eigenschaft *"
            errors={getFieldError('name')}
          >
            <Input
              value={config.name}
              onChange={(e) => onConfigChange({ name: e.target.value })}
              placeholder="z.B. Hat Schlüssel"
              className="w-full"
            />
          </FormInputFieldCustom>
        </div>

        <div className="flex flex-col gap-4 self-stretch px-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Feldeinstellungen
          </h3>

          {config.fieldType === 'text' && (
            <TextFieldSettings
              placeholder={config.placeholder || ''}
              maxLength={config.maxLength}
              isMultiline={config.isMultiline}
              defaultValue={config.defaultValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === 'number' && (
            <NumberFieldSettings
              isDecimal={config.isDecimal || false}
              minValue={config.minValue}
              maxValue={config.maxValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === 'boolean' && (
            <BooleanFieldSettings
              trueLabel={config.trueLabel || 'Ja'}
              falseLabel={config.falseLabel || 'Nein'}
              booleanDefaultValue={config.booleanDefaultValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === 'select' && (
            <SelectFieldSettings
              options={config.options || []}
              defaultOption={config.defaultOption}
              onChange={onConfigChange}
              errors={getFieldError('options')}
            />
          )}

          {config.fieldType === 'number' &&
            config.minValue !== undefined &&
            config.maxValue !== undefined &&
            config.minValue > config.maxValue && (
              <p className="text-sm text-red-600">
                {getFieldError('minValue')[0]}
              </p>
            )}
        </div>

        <UsageSettings
          isRequired={config.isRequired}
          onChange={onConfigChange}
          warningMessage={warningMessage}
        />

        <div className="inline-flex items-start justify-end gap-2 self-stretch border-t border-slate-200 px-4 pt-2">
          <Button
            onClick={onCancel}
            className="flex items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2 outline outline-1 outline-offset-[-1px] outline-slate-200"
          >
            <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
              Abbrechen
            </div>
          </Button>
          <Button
            onClick={handleSave}
            disabled={errors.length > 0}
            className="flex items-center justify-center gap-2.5 rounded-md bg-slate-900 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-white">
              Speichern
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
