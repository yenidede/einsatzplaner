'use client';

import SwitchIcon from '@/components/icon/SwitchIcon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { UserPropertyWithField } from '@/features/user_properties/user_property-dal';

interface UserPersonalPropertiesProps {
  organizationName: string;
  userProperties: UserPropertyWithField[];
  propertyValues: Record<string, string>;
  onPropertyValueChange: (propertyId: string, value: string) => void;
}

export function UserPersonalProperties({
  organizationName,
  userProperties,
  propertyValues,
  onPropertyValueChange,
}: UserPersonalPropertiesProps) {
  const renderField = (property: UserPropertyWithField) => {
    const value =
      propertyValues[property.id] || property.field.default_value || '';
    const fieldType = property.field.type?.datatype;

    switch (fieldType) {
      case 'text':
        if (property.field.is_multiline) {
          return (
            <Textarea
              value={value}
              onChange={(e) =>
                onPropertyValueChange(property.id, e.target.value)
              }
              placeholder={property.field.placeholder || ''}
              className="min-h-20 w-full resize-none rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300"
              maxLength={property.field.max || undefined}
            />
          );
        }
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            placeholder={property.field.placeholder || ''}
            className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300"
            maxLength={property.field.max || undefined}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            placeholder={property.field.placeholder || ''}
            className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300"
            min={property.field.min || undefined}
            max={property.field.max || undefined}
          />
        );

      case 'boolean':
        return (
          <button
            onClick={() => {
              const newValue = value === 'true' ? 'false' : 'true';
              onPropertyValueChange(property.id, newValue);
            }}
            className="cursor-pointer border-0 bg-transparent p-0 transition-opacity outline-none hover:bg-transparent focus:outline-none disabled:opacity-50"
          >
            <SwitchIcon isOn={value === 'true'} disabled={false} />
          </button>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300"
          >
            <option value="">Bitte wählen...</option>
            {property.field.allowed_values.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="inline-flex items-center justify-start gap-2 self-stretch border-b border-slate-200 px-4 py-2">
        <div className="flex flex-1 items-center justify-start gap-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Personeneigenschaften
          </div>
          <div className="justify-start font-['Inter'] text-sm leading-tight font-normal text-slate-600">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 self-stretch py-2">
        {userProperties.map((property) => (
          <div
            key={property.id}
            className="inline-flex items-start justify-start gap-4 self-stretch px-4"
          >
            <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
              <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
                {property.field.name}
                {property.field.is_required && (
                  <span className="ml-1 text-red-600">*</span>
                )}
              </div>
              {renderField(property)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
