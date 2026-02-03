'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export type FieldFormContext = 'person' | 'vorlage';

interface PropertyConfigurationProps {
  config: PropertyConfig;
  onConfigChange: (updates: Partial<PropertyConfig>) => void;
  onSave: () => void;
  onCancel: () => void;
  existingPropertyNames?: string[];
  existingUserCount?: number;
  /** Whether this form is for a person property or a template (Vorlage) field. Affects visibility of "Eingabe-Regeln für Personen". */
  context?: FieldFormContext;
  /** Optional title (default: "Neue Eigenschaft konfigurieren") */
  title?: string;
  /** Optional label for name field (default: "Name der Eigenschaft *") */
  nameLabel?: string;
  /** Optional save button text (default: "Speichern") */
  saveButtonLabel?: string;
  /** Optional: disable save button (e.g. while submitting) */
  saveDisabled?: boolean;
}

export function PropertyConfiguration({
  config,
  onConfigChange,
  onSave,
  onCancel,
  existingPropertyNames = [],
  existingUserCount = 0,
  context = 'person',
  title = 'Neue Eigenschaft konfigurieren',
  nameLabel = 'Name der Eigenschaft *',
  saveButtonLabel = 'Speichern',
  saveDisabled = false,
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

  const warningMessage =
    context === 'person'
      ? getRequiredFieldWarning(config.isRequired, existingUserCount)
      : null;

  const getFieldError = (fieldName: string): string[] => {
    return errors.filter((e) => e.field === fieldName).map((e) => e.message);
  };

  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          {title}
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-6 self-stretch border-t border-slate-200 py-4">
        <div className="flex flex-col gap-4 self-stretch">
          <h3 className="text-sm font-semibold text-slate-700">
            Grundinformationen
          </h3>

          <FormInputFieldCustom name={nameLabel} errors={getFieldError('name')}>
            <Input
              value={config.name}
              onChange={(e) => onConfigChange({ name: e.target.value })}
              placeholder={
                context === 'person'
                  ? 'Hat Schlüssel'
                  : 'Eigene Feldbezeichnung'
              }
              className="w-full"
            />
          </FormInputFieldCustom>
        </div>

        <div className="flex flex-col gap-4 self-stretch">
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

          {(config.fieldType === 'currency' ||
            config.fieldType === 'phone' ||
            config.fieldType === 'mail' ||
            config.fieldType === 'date' ||
            config.fieldType === 'time') && (
            <TextFieldSettings
              placeholder={config.placeholder || ''}
              maxLength={undefined}
              isMultiline={false}
              defaultValue={config.defaultValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === 'currency' && (
            <NumberFieldSettings
              isDecimal={true}
              minValue={config.minValue}
              maxValue={config.maxValue}
              onChange={onConfigChange}
            />
          )}

          {context === 'vorlage' && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.isRequired}
                onCheckedChange={(checked) =>
                  onConfigChange({ isRequired: checked === true })
                }
                id="isRequired"
              />
              <Label htmlFor="isRequired" className="text-sm font-medium">
                Pflichtfeld
              </Label>
            </div>
          )}

          {(config.fieldType === 'number' || config.fieldType === 'currency') &&
            config.minValue !== undefined &&
            config.maxValue !== undefined &&
            config.minValue > config.maxValue && (
              <p className="text-sm text-red-600">
                {getFieldError('minValue')[0]}
              </p>
            )}
        </div>

        {context === 'person' && (
          <UsageSettings
            isRequired={config.isRequired}
            onChange={onConfigChange}
            warningMessage={warningMessage}
          />
        )}

        <div className="inline-flex items-start justify-end gap-2 self-stretch border-t border-slate-200 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={errors.length > 0 || saveDisabled}
          >
            {saveButtonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
