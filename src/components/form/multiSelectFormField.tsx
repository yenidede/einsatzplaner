import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/form/multi-select';
import type { MultiSelectProps } from '@/components/form/multi-select';
import { Option } from '../form/formSelectField';
import ErrorDisplay from './errorDisplay';
import { Button } from '@/components/ui/button';
import { getUnavailableSelectValues } from '@/features/user_properties/utils/select-values';

type MultiSelectFormFieldPropsExtended = {
  name: string;
  options: Option[] | string[];
  errors: string[];
  onResetUnavailableValues?: () => void;
  hideLabel?: boolean;
} & Omit<MultiSelectProps, 'options'>;

export default function MultiSelectFormField({
  name,
  options,
  errors,
  onResetUnavailableValues,
  hideLabel = false,
  ...props
}: MultiSelectFormFieldPropsExtended) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  // Convert string array to Option array if needed
  const normalizedOptions: Option[] =
    options.length > 0 && typeof options[0] === 'string'
      ? (options as string[]).map((option) => ({
          value: option,
          label: option,
        }))
      : (options as Option[]);
  const selectedValues = props.value ?? props.defaultValue ?? [];
  const unavailableValues = getUnavailableSelectValues(
    selectedValues,
    normalizedOptions.map((option) => option.value)
  );
  const optionsWithHistoricalValues = [
    ...normalizedOptions,
    ...unavailableValues.map((value) => ({
      value,
      label: `${value} (nicht mehr verfügbar)`,
      disabled: true,
    })),
  ];
  return (
    <div>
      {!hideLabel && <Label htmlFor={sanitizedId}>{name}</Label>}
      <MultiSelect
        id={sanitizedId}
        animation={1}
        options={optionsWithHistoricalValues}
        className="mt-1.5"
        aria-invalid={errors.length > 0}
        {...props}
      />
      {unavailableValues.length > 0 && onResetUnavailableValues && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>Mindestens eine Auswahl ist nicht mehr verfügbar.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetUnavailableValues}
          >
            Zurücksetzen
          </Button>
        </div>
      )}
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
