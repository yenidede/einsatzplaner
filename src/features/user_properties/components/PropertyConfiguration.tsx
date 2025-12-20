"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/SimpleFormComponents";
import FormInputFieldCustom from "@/components/form/formInputFieldCustom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyConfig, ValidationError } from "../types";
import { UsageSettings } from "./UsageSettings";
import { TextFieldSettings } from "./fieldtypes/TextFieldSettings";
import { NumberFieldSettings } from "./fieldtypes/NumberFieldSettings";
import { BooleanFieldSettings } from "./fieldtypes/BooleanFieldSettings";
import { SelectFieldSettings } from "./fieldtypes/SelectFieldSettings";
import {
  validatePropertyConfig,
  getRequiredFieldWarning,
} from "../utils/validation";

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
    <div className="self-stretch flex flex-col justify-start items-start gap-2">
      <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
          Eigenschaft konfigurieren
        </div>
      </div>

      <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-6">
        {/* Grundlegende Informationen */}
        <div className="self-stretch px-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Grundinformationen
          </h3>

          <FormInputFieldCustom
            name="Name der Eigenschaft *"
            errors={getFieldError("name")}
          >
            <Input
              value={config.name}
              onChange={(e) => onConfigChange({ name: e.target.value })}
              placeholder="z.B. Hat Schlüssel"
              className="w-full"
            />
          </FormInputFieldCustom>

          <FormInputFieldCustom name="Beschreibung (optional)" errors={[]}>
            <Textarea
              value={config.description}
              onChange={(e) => onConfigChange({ description: e.target.value })}
              placeholder="Zusätzliche Informationen zur Eigenschaft (wird als Hilfetext angezeigt)"
              className="w-full min-h-[80px]"
            />
          </FormInputFieldCustom>
        </div>

        {/* Feldtyp-spezifische Einstellungen */}
        <div className="self-stretch px-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-700">
            Feldeinstellungen
          </h3>

          {config.fieldType === "text" && (
            <TextFieldSettings
              placeholder={config.placeholder || ""}
              maxLength={config.maxLength}
              isMultiline={config.isMultiline}
              defaultValue={config.defaultValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === "number" && (
            <NumberFieldSettings
              isDecimal={config.isDecimal || false}
              minValue={config.minValue}
              maxValue={config.maxValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === "boolean" && (
            <BooleanFieldSettings
              trueLabel={config.trueLabel || "Ja"}
              falseLabel={config.falseLabel || "Nein"}
              defaultValue={config.booleanDefaultValue}
              onChange={onConfigChange}
            />
          )}

          {config.fieldType === "select" && (
            <div className="flex flex-col gap-2">
              <SelectFieldSettings
                options={config.options || []}
                defaultOption={config.defaultOption}
                onChange={onConfigChange}
              />
              {getFieldError("options").length > 0 && (
                <p className="text-sm text-red-600">
                  {getFieldError("options")[0]}
                </p>
              )}
            </div>
          )}

          {config.fieldType === "number" &&
            getFieldError("minValue").length > 0 && (
              <p className="text-sm text-red-600">
                {getFieldError("minValue")[0]}
              </p>
            )}
        </div>

        {/* Eingabe-Regeln */}
        <UsageSettings
          isRequired={config.isRequired}
          onChange={onConfigChange}
          warningMessage={warningMessage}
        />

        {/* Aktionen */}
        <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2 border-t border-slate-200">
          <Button
            onClick={onCancel}
            className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
          >
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Abbrechen
            </div>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!config.name.trim() || errors.length > 0}
            className="px-4 py-2 bg-slate-900 text-white rounded-md flex justify-center items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
              Eigenschaft speichern
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
