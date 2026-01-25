'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EndHour, StartHour } from '@/components/event-calendar/constants';
import type { organization as Organization } from '@/generated/prisma';
import FormGroup from '../form/formGroup';
import FormField from '../form/formInputField';
import MultiSelectFormField from '../form/multiSelectFormField';
import FormInputFieldCustom from '../form/formInputFieldCustom';
import type { EinsatzFormData } from '@/components/event-calendar/event-dialog';
import { calcTotal, calcPricePerPersonFromTotal } from '../form/utils';
import { MultiSelect } from '../form/multi-select';
import { Textarea } from '../ui/textarea';

interface DefaultFormFieldsProps {
  formData: EinsatzFormData;
  onFormDataChange: (updates: Partial<EinsatzFormData>) => void;
  errors: {
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  };
  categoriesOptions: Array<{ value: string; label: string }>;
  usersOptions: Array<{ value: string; label: string }>;
  activeOrg: Organization | null;
  availableProps?: Array<{
    id: string;
    field: {
      name: string;
      type?: { datatype: string | null };
    };
  }>;
}

export function DefaultFormFields({
  formData,
  onFormDataChange,
  errors,
  categoriesOptions,
  usersOptions,
  activeOrg,
  availableProps,
}: DefaultFormFieldsProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
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
  const isEndDateEdited = useRef(
    formData.endDate &&
      formData.startDate &&
      format(formData.endDate, 'yyyy-MM-dd') !==
        format(formData.startDate, 'yyyy-MM-dd')
  );

  useEffect(() => {
    isEndDateEdited.current = !!(
      formData.endDate &&
      formData.startDate &&
      format(formData.endDate, 'yyyy-MM-dd') !==
        format(formData.startDate, 'yyyy-MM-dd')
    );
  }, [formData.startDate, formData.endDate]);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = StartHour; hour <= EndHour - 1; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        const value = `${formattedHour}:${formattedMinute}`;
        const label = `${formattedHour}:${formattedMinute}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  const handleChange = (field: keyof EinsatzFormData, value: any) => {
    onFormDataChange({ [field]: value });
  };

  return (
    <>
      <FormGroup className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
        <FormField
          name={'Name ' + (activeOrg?.einsatz_name_singular ?? 'Einsatz')}
          placeholder="Name eingeben..."
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          errors={errors.fieldErrors['title'] || []}
        />
        <MultiSelectFormField
          name="Kategorien"
          options={categoriesOptions}
          value={formData.einsatzCategoriesIds ?? []}
          placeholder="Kategorien auswählen"
          animation={1}
          onValueChange={(selectedValues) => {
            handleChange('einsatzCategoriesIds', selectedValues);
          }}
          errors={errors.fieldErrors['einsatzCategoriesIds'] || []}
        />
      </FormGroup>

      <div className="flex flex-col gap-4">
        <FormGroup className="flex flex-row">
          <FormInputFieldCustom
            className="flex-1"
            name="Start Datum"
            errors={errors.fieldErrors['startDate'] || []}
          >
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start_datum"
                  variant={'outline'}
                  className={cn(
                    'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]',
                    !formData.startDate && 'text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'truncate',
                      !formData.startDate && 'text-muted-foreground'
                    )}
                  >
                    {formData.startDate
                      ? format(formData.startDate, 'PPP', { locale: de })
                      : 'Datum auswählen'}
                  </span>
                  <RiCalendarLine
                    size={16}
                    className="text-muted-foreground/80 shrink-0"
                    aria-hidden="true"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  defaultMonth={formData.startDate}
                  locale={de}
                  onSelect={(date) => {
                    if (date) {
                      // Auto-adjust end date unless user already edited it
                      if (!isEndDateEdited.current) {
                        const updates: Partial<EinsatzFormData> = {
                          startDate: date,
                          endDate: date,
                        };
                        onFormDataChange(updates);
                      } else {
                        handleChange('startDate', date);
                      }
                      setStartDateOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormInputFieldCustom>
          {!formData.all_day && (
            <div className="min-w-28 *:not-first:mt-1.5">
              <FormInputFieldCustom
                name="Start Zeit"
                errors={errors.fieldErrors['startTime'] || []}
              >
                <Select
                  value={formData.startTime}
                  onValueChange={(value) => handleChange('startTime', value)}
                >
                  <SelectTrigger id="start_time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormInputFieldCustom>
            </div>
          )}
        </FormGroup>
        <FormGroup className="flex flex-row">
          <FormInputFieldCustom
            className="flex-1"
            name="Ende Datum"
            errors={errors.fieldErrors['endDate'] || []}
          >
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="ende_datum"
                  variant={'outline'}
                  className={cn(
                    'group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]',
                    !formData.endDate && 'text-muted-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'truncate',
                      !formData.endDate && 'text-muted-foreground'
                    )}
                  >
                    {formData.endDate
                      ? format(formData.endDate, 'PPP', { locale: de })
                      : 'Datum auswählen'}
                  </span>
                  <RiCalendarLine
                    size={16}
                    className="text-muted-foreground/80 shrink-0"
                    aria-hidden="true"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar
                  mode="single"
                  selected={formData.endDate}
                  defaultMonth={formData.endDate}
                  locale={de}
                  onSelect={(date) => {
                    if (date) {
                      // Mark as edited when user picks an explicit end date
                      isEndDateEdited.current = true;
                      handleChange('endDate', date);
                      setEndDateOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormInputFieldCustom>
          {!formData.all_day && (
            <div className="min-w-28">
              <FormInputFieldCustom
                name="Ende Zeit"
                errors={errors.fieldErrors['endTime'] || []}
              >
                <Select
                  value={formData.endTime}
                  onValueChange={(value) => handleChange('endTime', value)}
                >
                  <SelectTrigger id="end_time">
                    <SelectValue placeholder="Zeit auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormInputFieldCustom>
            </div>
          )}
        </FormGroup>
        <div className="flex items-center gap-2">
          <Checkbox
            id="all-day"
            checked={formData.all_day}
            onCheckedChange={(checked) =>
              handleChange('all_day', checked === true)
            }
          />
          <Label htmlFor="all-day">Ganztägig</Label>
        </div>
      </div>

      {/* Participant and Price Fields */}
      <FormGroup className="grid grid-cols-2 grid-rows-2 sm:flex sm:flex-row">
        <div className="col-span-2 grow">
          <FormField
            name="Teilnehmeranzahl"
            type="number"
            value={formData.participantCount || ''}
            placeholder=""
            errors={errors.fieldErrors['participantCount'] || []}
            onChange={(e) => {
              const participantCount = Number(e.target.value) || 0;
              onFormDataChange({
                participantCount,
                totalPrice: calcTotal(
                  formData.pricePerPerson ?? 0,
                  participantCount
                ),
              });
            }}
          />
        </div>
        <div className="grow">
          <FormField
            step={0.01}
            name="Preis p. Person (€)"
            type="number"
            min={0}
            value={formData.pricePerPerson ?? ''}
            errors={errors.fieldErrors['pricePerPerson'] || []}
            className="grow"
            onChange={(e) => {
              const pricePerPerson = Number(e.target.value) || 0;
              onFormDataChange({
                pricePerPerson,
                totalPrice: calcTotal(
                  pricePerPerson,
                  formData.participantCount ?? 0
                ),
              });
            }}
          />
        </div>
        <div className="sm:w-28 sm:min-w-28">
          <FormField
            step={0.01}
            name="Gesamtpreis (€)"
            type="number"
            min={0}
            value={formData.totalPrice ?? ''}
            errors={errors.fieldErrors['totalPrice'] || []}
            className="shrink-20"
            onChange={(e) => {
              const totalPrice = Number(e.target.value) || 0;
              const pricePerPerson = calcPricePerPersonFromTotal(
                totalPrice,
                formData.participantCount
              );
              onFormDataChange({
                totalPrice,
                pricePerPerson,
              });
            }}
          />
        </div>
      </FormGroup>
      {/* Helpers and User Selection */}
      <FormGroup>
        <FormField
          name={'Anzahl ' + (activeOrg?.helper_name_plural ?? 'Helfer')}
          type="number"
          min={0}
          value={formData.helpersNeeded >= 0 ? formData.helpersNeeded : ''}
          placeholder=""
          errors={errors.fieldErrors['helpersNeeded'] || []}
          onChange={(e) =>
            handleChange('helpersNeeded', Number(e.target.value) || -1)
          }
        />
        <MultiSelectFormField
          name="Ausgewählte Personen"
          options={usersOptions}
          value={formData.assignedUsers}
          placeholder="Personen auswählen"
          animation={1}
          errors={errors.fieldErrors['assignedUsers'] || []}
          allowedActiveItems={
            formData.helpersNeeded > 0 ? formData.helpersNeeded : undefined
          }
          onValueChange={(selectedValues) => {
            handleChange('assignedUsers', selectedValues);
          }}
        />
      </FormGroup>
      <FormInputFieldCustom
        name="Anmerkung"
        errors={errors.fieldErrors['anmerkung'] || []}
      >
        <Textarea
          className="mt-2 min-h-[100px] font-normal"
          placeholder="Anmerkung"
          value={formData.anmerkung || ''}
          onChange={(e) => {
            handleChange('anmerkung', e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        ></Textarea>
      </FormInputFieldCustom>
      {/* Helpers and User Selection */}
      <div className="space-y-3">
        <FormInputFieldCustom
          name="Benötigte Personeneigenschaften"
          errors={[]}
        >
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
          />
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
                  className="bg-muted/50 flex items-center gap-3 rounded-md p-2"
                >
                  <div className="flex-1 text-sm font-medium">
                    {property.field.name}
                  </div>

                  <div className="flex items-center gap-2">
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
                      className="cursor-pointer text-xs"
                    >
                      Erforderlich
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
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
    </>
  );
}
