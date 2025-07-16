export interface Einsatz {
  _id?: string;
  name: string;
  kategorie: string;
  datum: Date;
  uhrzeitVon: string;
  uhrzeitBis: string;
  anzahlTeilnehmer: number;
  einzelpreis: number;
  anzahlHelfer: number;
  helfer: string[];
  customFields?: CustomFieldValue[];
  status: EinsatzStatus;
  systemStatus: EinsatzSystemStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CustomFieldDefinition {
  _id?: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // For dropdown fields
  defaultValue?: any;
  validation?: CustomFieldValidation;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldValue {
  fieldId: string;
  value: any;
  fieldName: string;
  fieldType: CustomFieldType;
}

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  TOGGLE = 'toggle',
  TEXTAREA = 'textarea'
}

export enum EinsatzStatus {
  OFFEN = 'offen',
  UNVOLLSTAENDIG = 'unvollstaendig',
  VERGEBEN = 'vergeben'
}

export enum EinsatzSystemStatus {
  ENTWURF = 'entwurf',
  VEROEFFENTLICHT = 'veroeffentlicht'
}

export interface EinsatzFilter {
  name?: string;
  kategorie?: string;
  datum?: {
    from?: Date;
    to?: Date;
  };
  status?: EinsatzStatus;
  systemStatus?: EinsatzSystemStatus;
  customFields?: Record<string, any>;
}

export interface EinsatzFormData extends Omit<Einsatz, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  _id?: string;
}

export interface AutosaveData {
  einsatzId?: string;
  formData: Partial<EinsatzFormData>;
  lastSaved: Date;
  isDirty: boolean;
}
