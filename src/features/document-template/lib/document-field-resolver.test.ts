import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DocumentTemplateFieldDefinition,
  DocumentTemplateFieldGroup,
} from '@/features/document-template/types';

const mocks = vi.hoisted(() => ({
  findEinsatz: vi.fn(),
  getDefinitions: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { einsatz: { findFirst: mocks.findEinsatz } },
}));

vi.mock('./document-template-fields', () => ({
  getDocumentTemplateFieldDefinitions: mocks.getDefinitions,
}));

import { resolveDocumentTemplateFields } from './document-field-resolver';

function field(
  key: string,
  group: DocumentTemplateFieldGroup,
  dataType: DocumentTemplateFieldDefinition['dataType']
): DocumentTemplateFieldDefinition {
  return {
    key,
    label: key,
    group,
    description: key,
    source: 'standard',
    dataType,
  };
}

const visibleStandardFields: DocumentTemplateFieldDefinition[] = [
  field('assignmentName', 'general', 'text'),
  field('assignmentDate', 'general', 'date'),
  field('assignmentStartTime', 'general', 'time'),
  field('assignmentEndTime', 'general', 'time'),
  field('assignmentDuration', 'general', 'text'),
  field('assignmentStatus', 'general', 'text'),
  field('programName', 'event', 'text'),
  field('categories', 'event', 'list'),
  field('participantCount', 'event', 'number'),
  field('pricePerPerson', 'event', 'currency'),
  field('totalPrice', 'event', 'currency'),
  field('note', 'event', 'rich_text'),
  field('responsiblePerson', 'staff', 'person'),
  field('helpers', 'staff', 'list'),
  field('organizationName', 'administration', 'text'),
  field('organizationEmail', 'administration', 'email'),
  field('organizationPhone', 'administration', 'phone'),
  field('organizationAddress', 'administration', 'text'),
  field('pageNumber', 'administration', 'number'),
];

describe('Resolver für sichtbare dynamische Felder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDefinitions.mockResolvedValue(visibleStandardFields);
    mocks.findEinsatz.mockResolvedValue({
      title: 'Abendführung',
      start: new Date('2026-06-16T10:00:00Z'),
      end: new Date('2026-06-16T11:30:00Z'),
      participant_count: 20,
      price_per_person: 12.5,
      total_price: 250,
      anmerkung: 'Bitte Seiteneingang verwenden.',
      organization: {
        name: 'Museum Österreich',
        email: 'office@example.org',
        phone: '+43 1 234567',
        logo_url: null,
        organization_address: [
          {
            street: 'Museumstraße 1',
            postal_code: '1010',
            city: 'Wien',
            country: 'Österreich',
          },
        ],
      },
      user: { firstname: 'Maria', lastname: 'Muster' },
      einsatz_template: { name: 'Abendprogramm' },
      einsatz_status: { verwalter_text: 'Bestätigt' },
      einsatz_helper: [
        {
          user: {
            firstname: 'Max',
            lastname: 'Beispiel',
            email: 'max@example.org',
            phone: null,
          },
        },
      ],
      einsatz_to_category: [
        { einsatz_category: { value: 'Führung' } },
      ],
      einsatz_field: [],
    });
  });

  it('liefert für jedes sichtbare Standardfeld einen Exportwert', async () => {
    const resolved = await resolveDocumentTemplateFields({
      organizationId: 'organization-1',
      einsatzId: 'einsatz-1',
    });

    for (const definition of visibleStandardFields) {
      expect(resolved[definition.key]?.formattedValue).not.toBe('—');
    }
    expect(resolved.pageNumber?.formattedValue).toBe('{{pageNumber}}');
    expect(resolved.organizationAddress?.formattedValue).toBe(
      'Museumstraße 1, 1010 Wien, Österreich'
    );
  });

  it('behält eigene Feldnamen und löst deren Wert über field_id auf', async () => {
    const customField: DocumentTemplateFieldDefinition = {
      key: 'custom.wetter_test',
      label: 'Wetter_Test Österreich',
      group: 'custom',
      description: 'Wetter',
      source: 'custom_field',
      sourceFieldId: 'field-1',
      dataType: 'text',
    };
    mocks.getDefinitions.mockResolvedValue([
      ...visibleStandardFields,
      customField,
    ]);
    const einsatz = await mocks.findEinsatz();
    mocks.findEinsatz.mockResolvedValue({
      ...einsatz,
      einsatz_field: [
        {
          field_id: 'field-1',
          value: 'Sonnig',
          field: {
            name: 'Wetter_Test Österreich',
            allowed_values: [],
            type: { datatype: 'text' },
          },
        },
      ],
    });

    const resolved = await resolveDocumentTemplateFields({
      organizationId: 'organization-1',
      einsatzId: 'einsatz-1',
    });

    expect(resolved['custom.wetter_test']?.definition.label).toBe(
      'Wetter_Test Österreich'
    );
    expect(resolved['custom.wetter_test']?.formattedValue).toBe('Sonnig');
  });

  it('formatiert fehlende optionale Backend-Werte einheitlich als Gedankenstrich', async () => {
    const einsatz = await mocks.findEinsatz();
    mocks.findEinsatz.mockResolvedValue({
      ...einsatz,
      participant_count: null,
      price_per_person: null,
      total_price: null,
      anmerkung: null,
      einsatz_template: null,
      einsatz_helper: [],
      einsatz_to_category: [],
      organization: {
        ...einsatz.organization,
        email: null,
        phone: null,
        organization_address: [],
      },
    });

    const resolved = await resolveDocumentTemplateFields({
      organizationId: 'organization-1',
      einsatzId: 'einsatz-1',
    });

    for (const key of [
      'participantCount',
      'pricePerPerson',
      'totalPrice',
      'note',
      'programName',
      'helpers',
      'organizationEmail',
      'organizationPhone',
      'organizationAddress',
    ]) {
      expect(resolved[key]?.formattedValue).toBe('—');
    }
  });
});
