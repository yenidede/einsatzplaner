import { Control, Controller, FieldErrors } from 'react-hook-form';
import FormGroup from '../form/formGroup';
import FormInput from '../form/formInputField';
import FormSwitchField from '../form/formSwitchField';
import FormSelectField from '../form/formSelectField';
import FormMultiSelectField from '../form/multiSelectFormField';
import { CustomFormField } from './types';
import FormTextareaField from '../form/formTextareaField';
import { mapStringValueToType } from './utils';

type DynamicFormFieldsProps = {
  fields: CustomFormField[];
  control: Control<any>;
  errors?: FieldErrors<any>;
};

export default function DynamicFormFields({
  fields,
  control,
  errors = {},
}: DynamicFormFieldsProps) {
  const getDefaultValue = (field: CustomFormField) => {
    switch (field.inputType) {
      case 'checkbox':
        return field.defaultValue === 'TRUE' || field.defaultValue === true;
      case 'select':
        return field.defaultValue ?? null;
      case 'multi-select':
        return typeof field.defaultValue === 'string'
          ? field.defaultValue.split(',').map((item) => item.trim())
          : (field.defaultValue ?? []);
      case 'textarea':
        return field.defaultValue ?? '';
      default:
        // text, number, currency, phone, mail, etc.
        return field.defaultValue ?? '';
    }
  };

  const renderFieldComponent = (
    field: CustomFormField,
    controllerField: any,
    fieldErrors: string[]
  ): React.ReactElement | null => {
    const commonProps = {
      name: field.displayName,
      errors: fieldErrors,
    };

    switch (field.inputType) {
      case 'checkbox':
        return (
          <FormSwitchField
            {...commonProps}
            checked={controllerField.value ?? false}
            onCheckedChange={controllerField.onChange}
          />
        );
      case 'select':
        return (
          <FormSelectField
            {...commonProps}
            options={field.allowedValues ?? []}
            value={controllerField.value ?? ''}
            placeholder={field.placeholder ?? 'Feld auswählen...'}
            required={field.required}
            onValueChange={controllerField.onChange}
            allowClear={!field.required}
          />
        );
      case 'multi-select':
        return (
          <FormMultiSelectField
            {...commonProps}
            options={field.allowedValues ?? ['(problem loading options)']}
            onValueChange={controllerField.onChange}
            defaultValue={controllerField.value}
            aria-required={field.required}
          />
        );
      case 'textarea':
        return (
          <FormTextareaField
            {...commonProps}
            placeholder={field.placeholder ?? ''}
            value={controllerField.value ?? ''}
            required={field.required}
            onChange={(e) => {
              const convertedValue = mapStringValueToType(
                e.target.value,
                field.dataType
              );
              controllerField.onChange(convertedValue);
            }}
          />
        );
      case 'default':
        if (field.isMultiline === true) {
          return (
            <FormTextareaField
              {...commonProps}
              placeholder={field.placeholder ?? ''}
              value={controllerField.value ?? ''}
              required={field.required}
              onChange={(e) => {
                const convertedValue = mapStringValueToType(
                  e.target.value,
                  field.dataType
                );
                controllerField.onChange(convertedValue);
              }}
            />
          );
        }
        return (
          <FormInput
            {...commonProps}
            placeholder={field.placeholder ?? undefined}
            value={controllerField.value ?? ''}
            onChange={(e) => {
              const convertedValue = mapStringValueToType(
                e.target.value,
                field.dataType
              );
              controllerField.onChange(convertedValue);
            }}
            {...field.inputProps}
          />
        );
      default:
        return null;
    }
  };

  const renderField = (field: CustomFormField) => {
    const fieldError = errors[field.id];
    const fieldErrors = fieldError?.message ? [String(fieldError.message)] : [];

    return (
      <Controller
        key={field.id}
        name={field.id}
        control={control}
        defaultValue={getDefaultValue(field)}
        render={({ field: controllerField }) =>
          renderFieldComponent(field, controllerField, fieldErrors) ?? <></>
        }
      />
    );
  };

  // Group fields by groupName
  const groupedFields = fields.reduce(
    (groups, field) => {
      const groupName = field.groupName || 'Sonstiges'; // Default group name
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(field);
      return groups;
    },
    {} as Record<string, CustomFormField[]>
  );

  return (
    <>
      {Object.entries(groupedFields).map(([groupName, groupFields]) => (
        <FormGroup key={groupName}>
          {/* Optional: Add group title */}
          {groupName !== 'Sonstiges' && (
            <h3 className="mb-4 text-lg font-medium">{groupName}</h3>
          )}
          {groupFields.map((field) => renderField(field))}
        </FormGroup>
      ))}
    </>
  );
}
