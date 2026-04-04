export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'currency'
  | 'group'
  | 'date'
  | 'time'
  | 'phone'
  | 'mail';
export type Step = 'overview' | 'typeSelection' | 'configuration';

export interface PropertyConfig {
  name: string;
  description: string;
  fieldType: FieldType | null;

  // Text-spezifisch
  placeholder?: string;
  maxLength?: number;
  isMultiline?: boolean;

  // Zahl-spezifisch
  minValue?: number;
  maxValue?: number;
  isDecimal?: boolean;

  // Boolean-spezifisch
  trueLabel?: string;
  falseLabel?: string;
  booleanDefaultValue?: boolean | null;

  // Select-spezifisch
  options?: string[];
  defaultOption?: string;

  // Allgemeine Einstellungen
  isRequired: boolean;
  defaultValue?: string;
}

export const INITIAL_CONFIG: PropertyConfig = {
  name: '',
  description: '',
  fieldType: null,
  placeholder: '',
  maxLength: undefined,
  isMultiline: false,
  minValue: undefined,
  maxValue: undefined,
  isDecimal: false,
  trueLabel: 'Ja',
  falseLabel: 'Nein',
  booleanDefaultValue: null,
  options: [],
  defaultOption: undefined,
  isRequired: false,
  defaultValue: '',
};

// Validierungsfehler
export interface ValidationError {
  field: string;
  message: string;
}

export interface ExistingProperty {
  id: string;
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  userCount?: number;
}
