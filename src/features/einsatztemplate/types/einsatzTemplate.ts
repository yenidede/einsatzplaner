// EinsatzTemplate type definition
export interface EinsatzTemplate {
  _id: string;
  name: string;
  description?: string;
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
    options?: string[];
    defaultValue?: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Example: Template for a Freizeit-Einsatz
export const exampleTemplates: EinsatzTemplate[] = [
  {
    _id: 'template_freizeit',
    name: 'Freizeit (KiJu)',
    description: 'Standard-Template für Freizeit-Einsätze',
    fields: [
      { name: 'Name', type: 'text', required: true },
      { name: 'Datum', type: 'date', required: true },
      { name: 'Teilnehmer', type: 'number', required: true },
      { name: 'Beschreibung', type: 'textarea' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
