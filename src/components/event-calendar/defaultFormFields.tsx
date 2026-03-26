'use client';

import { useState } from 'react';
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
import type { organization as Organization } from '@/generated/prisma';
import FormGroup from '../form/formGroup';
import FormField from '../form/formInputField';
import MultiSelectFormField from '../form/multiSelectFormField';
import FormInputFieldCustom from '../form/formInputFieldCustom';
import { TimeTextInput } from '@/components/form/TimeTextInput';
import type { EinsatzFormData } from '@/components/event-calendar/event-dialog';
import { calcTotal, calcPricePerPersonFromTotal } from '../form/utils';
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
  onTimeFieldErrorChange: (
    field: 'startTime' | 'endTime',
    error: string | null
  ) => void;
}

/**
 * Renders the default form UI for editing EinsatzFormData, including title, categories, start/end date & time, all-day toggle, participant and price controls, helper assignment, and a resizable note field.
 *
 * @returns A React element containing the composed form fields and controls for an Einsatz.
 */
export function DefaultFormFields({
  formData,
  onFormDataChange,
  errors,
  categoriesOptions,
  usersOptions,
  activeOrg,
  onTimeFieldErrorChange,
}: DefaultFormFieldsProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleChange = <TField extends keyof EinsatzFormData>(
    field: TField,
    value: EinsatzFormData[TField]
  ) => {
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
        <FormGroup className="flex flex-col sm:flex-row">
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
                  size="lg"
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
                      handleChange('startDate', date);
                      setStartDateOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormInputFieldCustom>
          {!formData.all_day && (
            <div className="*:not-first:mt-1.5 sm:min-w-28">
              <FormInputFieldCustom
                name="Start Zeit"
                errors={errors.fieldErrors['startTime'] || []}
              >
                <TimeTextInput
                  id="start_time"
                  value={formData.startTime}
                  onValueChange={(value) => handleChange('startTime', value)}
                  onValidationChange={(error) =>
                    onTimeFieldErrorChange('startTime', error)
                  }
                  invalidMessage="Bitte geben Sie eine gültige Startzeit ein, z. B. 09:30."
                  className="w-full"
                />
              </FormInputFieldCustom>
            </div>
          )}
        </FormGroup>
        <FormGroup className="flex flex-col sm:flex-row">
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
                  size="lg"
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
                <TimeTextInput
                  id="end_time"
                  value={formData.endTime}
                  onValueChange={(value) => handleChange('endTime', value)}
                  onValidationChange={(error) =>
                    onTimeFieldErrorChange('endTime', error)
                  }
                  invalidMessage="Bitte geben Sie eine gültige Endzeit ein, z. B. 12:20."
                  className="w-full"
                />
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
            min={0}
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
            step={0.5}
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
            step={0.5}
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
    </>
  );
}
