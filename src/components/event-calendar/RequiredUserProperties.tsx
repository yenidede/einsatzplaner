'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import FormInputFieldCustom from '../form/formInputFieldCustom';
import type { EinsatzFormData } from '@/components/event-calendar/event-dialog';
import { MultiSelect } from '../form/multi-select';

interface RequiredUserPropertiesProps {
  formData: EinsatzFormData;
  onFormDataChange: (updates: Partial<EinsatzFormData>) => void;
  availableProps?: Array<{
    id: string;
    field: {
      name: string;
    };
  }>;
}

export function RequiredUserProperties({
  formData,
  onFormDataChange,
  availableProps,
}: RequiredUserPropertiesProps) {
  const [propertyConfigs, setPropertyConfigs] = useState<
    Array<{
      user_property_id: string;
      is_required: boolean;
      min_matching_users: number | null;
    }>
  >(() => {
    const v = formData.requiredUserProperties ?? [];
    if (v.length === 0) return [];
    if (typeof v[0] === 'string') {
      return (v as unknown as string[]).map((id) => ({
        user_property_id: id,
        is_required: true,
        min_matching_users: 1,
      }));
    }
    return (v as any[]).map((p) => ({
      user_property_id: p.user_property_id,
      is_required: p.is_required ?? true,
      min_matching_users:
        typeof p.min_matching_users === 'number'
          ? p.min_matching_users
          : p.min_matching_users == null
            ? 1
            : null,
    }));
  });

  const prevPropsRef = useRef<string>('');
  useEffect(() => {
    const currentPropsStr = JSON.stringify(
      formData.requiredUserProperties ?? []
    );

    if (prevPropsRef.current !== currentPropsStr) {
      const incoming = formData.requiredUserProperties ?? [];
      let normalized: typeof propertyConfigs = [];

      if (incoming.length > 0) {
        if (typeof incoming[0] === 'string') {
          normalized = (incoming as unknown as string[]).map((id) => ({
            user_property_id: id,
            is_required: true,
            min_matching_users: 1,
          }));
        } else {
          normalized = (incoming as any[]).map((p) => ({
            user_property_id: p.user_property_id,
            is_required: p.is_required ?? true,
            min_matching_users:
              typeof p.min_matching_users === 'number'
                ? p.min_matching_users
                : p.min_matching_users == null
                  ? 1
                  : null,
          }));
        }
      }

      setPropertyConfigs((prev) => {
        const prevStr = JSON.stringify(prev);
        const normalizedStr = JSON.stringify(normalized);
        if (prevStr === normalizedStr) return prev;
        return normalized;
      });
    }

    prevPropsRef.current = currentPropsStr;
  }, [formData.requiredUserProperties]);

  const handlePropertySelectionChange = (selectedIds: string[]) => {
    const newConfigs = selectedIds.map((id) => {
      const existing = propertyConfigs.find((c) => c.user_property_id === id);
      return (
        existing ?? {
          user_property_id: id,
          is_required: true,
          min_matching_users: 1,
        }
      );
    });

    setPropertyConfigs(newConfigs);
    onFormDataChange({ requiredUserProperties: newConfigs });
  };

  const handlePropertyConfigChange = (
    propertyId: string,
    updates: { is_required?: boolean; min_matching_users?: number | null }
  ) => {
    const newConfigs = propertyConfigs.map((config) =>
      config.user_property_id === propertyId
        ? { ...config, ...updates }
        : config
    );
    setPropertyConfigs(newConfigs);
    onFormDataChange({ requiredUserProperties: newConfigs });
  };

  return (
    <div className="space-y-3">
      <FormInputFieldCustom
        name="Benötigte Personeneigenschaften"
        errors={[]}
      >
        <div className="min-w-0 overflow-x-hidden">
          <MultiSelect
            options={
              availableProps?.map((prop) => ({
                value: prop.id,
                label: String(prop.field.name),
              })) ?? []
            }
            value={propertyConfigs.map((c) => c.user_property_id)}
            onValueChange={handlePropertySelectionChange}
            placeholder="Eigenschaften auswählen..."
            className="min-w-0"
          />
        </div>
      </FormInputFieldCustom>

      {/* Per-property configuration */}
      {propertyConfigs.length > 0 && (
        <div className="border-muted space-y-2 border-l-2 pl-4">
          {propertyConfigs.map((config) => {
            const property = availableProps?.find(
              (p) => p.id === config.user_property_id
            );
            if (!property) return null;

            return (
              <div
                key={config.user_property_id}
                className="bg-muted/50 flex flex-col gap-2 rounded-md p-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1 text-sm font-medium wrap-break-word">
                  {property.field.name}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Checkbox
                    id={`required-${config.user_property_id}`}
                    checked={config.is_required}
                    onCheckedChange={(checked) =>
                      handlePropertyConfigChange(config.user_property_id, {
                        is_required: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor={`required-${config.user_property_id}`}
                    className="cursor-pointer text-xs whitespace-nowrap"
                  >
                    Erforderlich
                  </Label>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Label
                    htmlFor={`min-${config.user_property_id}`}
                    className="text-xs whitespace-nowrap"
                  >
                    Min:
                  </Label>
                  <div className="relative">
                    <input
                      id={`min-${config.user_property_id}`}
                      type="number"
                      min={0}
                      disabled={!config.is_required}
                      className={cn(
                        'h-8 w-20 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                        config.is_required &&
                          config.min_matching_users === -1 &&
                          'text-transparent'
                      )}
                      value={
                        !config.is_required
                          ? ''
                          : config.min_matching_users === -1
                            ? 0
                            : (config.min_matching_users ?? 1)
                      }
                      onChange={(e) => {
                        if (!config.is_required) return;
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          handlePropertyConfigChange(
                            config.user_property_id,
                            {
                              min_matching_users: value === 0 ? -1 : value,
                            }
                          );
                        }
                      }}
                      placeholder={config.is_required ? '1' : '-'}
                    />
                    {config.is_required &&
                      config.min_matching_users === -1 && (
                        <span className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm">
                          Alle
                        </span>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
