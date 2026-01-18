import { Control, Controller, FieldErrors } from 'react-hook-form';
import FormGroup from '../form/formGroup';
import FormInput from '../form/formInputField';
import FormSwitchField from '../form/formSwitchField';
import FormSelectField from '../form/formSelectField';
import FormMultiSelectField from '../form/multiSelectFormField';
import { CustomFormField } from './types';
import FormTextareaField from '../form/formTextareaField';

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
  const renderField = (field: CustomFormField) => {
    // Extract error messages from React Hook Form error structure
    const fieldError = errors[field.id];
    const fieldErrors = fieldError?.message ? [String(fieldError.message)] : [];

    switch (field.inputType) {
      case 'checkbox':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue={false}
            render={({ field: controllerField }) => (
              <FormSwitchField
                name={field.displayName}
                checked={controllerField.value ?? false}
                onCheckedChange={controllerField.onChange}
                errors={fieldErrors}
              />
            )}
          />
        );
      case 'select':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue=""
            render={({ field: controllerField }) => (
              <FormSelectField
                name={field.displayName}
                options={field.allowedValues ?? []}
                value={controllerField.value ?? ''}
                placeholder={field.placeholder ?? 'Feld auswählen...'}
                required={field.required}
                onValueChange={controllerField.onChange}
                errors={fieldErrors}
              />
            )}
          />
        );
      case 'multi-select':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue={
              typeof field.defaultValue === 'string'
                ? field.defaultValue.split(',').map((item) => item.trim())
                : field.defaultValue
            }
            render={({ field: controllerField }) => (
              <FormMultiSelectField
                name={field.displayName}
                options={field.allowedValues ?? ['(problem loading options)']}
                onValueChange={controllerField.onChange}
                defaultValue={controllerField.value}
                aria-required={field.required}
                errors={fieldErrors}
              />
            )}
          />
        );
      case 'textarea':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue=""
            render={({ field: controllerField }) => (
              <FormTextareaField
                name={field.displayName}
                placeholder={field.placeholder ?? ''}
                value={controllerField.value ?? ''}
                required={field.required}
                onChange={(e) => controllerField.onChange(e.target.value)}
                errors={fieldErrors}
              />
            )}
          />
        );
      case 'default':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue=""
            render={({ field: controllerField }) => (
              <FormInput
                name={field.displayName}
                placeholder={field.placeholder ?? undefined}
                value={controllerField.value ?? ''}
                onChange={(e) => controllerField.onChange(e.target.value)}
                errors={fieldErrors}
                {...field.inputProps}
              />
            )}
          />
        );
      default:
        return null;
    }
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
