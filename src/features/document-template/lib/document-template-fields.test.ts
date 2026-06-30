import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindOrganization, mockFindTemplateFields } = vi.hoisted(() => ({
  mockFindOrganization: vi.fn(),
  mockFindTemplateFields: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    organization: { findUnique: mockFindOrganization },
    template_field: { findMany: mockFindTemplateFields },
  },
}));

import { getDocumentTemplateFieldDefinitions } from './document-template-fields';

describe('Dokumentvorlagen-Felder', () => {
  beforeEach(() => {
    mockFindTemplateFields.mockResolvedValue([]);
    mockFindOrganization.mockResolvedValue({
      einsatz_name_singular: 'Führung',
      einsatz_name_plural: 'Führungen',
      helper_name_plural: 'Vermittler:innen',
      logo_url: null,
      email: 'museum@example.org',
      phone: null,
      _count: { organization_address: 1 },
    });
  });

  it('verwendet Organisationsbegriffe und blendet nicht verfügbare Felder aus', async () => {
    const fields = await getDocumentTemplateFieldDefinitions('org-1');

    expect(
      fields.find((field) => field.key === 'assignmentName')
    ).toMatchObject({ label: 'Führung' });
    expect(fields.find((field) => field.key === 'helpers')).toMatchObject({
      label: 'Vermittler:innen',
    });
    expect(fields.find((field) => field.key === 'guides')).toMatchObject({
      availableInLibrary: false,
    });
    expect(fields.find((field) => field.key === 'location')).toMatchObject({
      availableInLibrary: false,
    });
    expect(fields.find((field) => field.key === 'contactPerson')).toMatchObject(
      { availableInLibrary: false }
    );
    expect(fields.find((field) => field.key === 'programName')).toMatchObject({
      label: 'Ausgewählte Vorlage',
    });
    expect(fields.find((field) => field.key === 'categories')).toMatchObject({
      label: 'Kategorien',
    });
    expect(
      fields.find((field) => field.key === 'organizationName')
    ).toMatchObject({ label: 'Organisationsname', group: 'administration' });
    expect(
      fields.find((field) => field.key === 'administrationName')
    ).toMatchObject({ availableInLibrary: false });
    expect(
      fields.find((field) => field.key === 'organizationLogoUrl')
    ).toMatchObject({ availableInLibrary: false });
    expect(
      fields.find((field) => field.key === 'organizationEmail')
    ).not.toMatchObject({ availableInLibrary: false });
    expect(
      fields.find((field) => field.key === 'organizationAddress')
    ).not.toMatchObject({ availableInLibrary: false });
  });

  it('bietet ein konfiguriertes eigenes Feld nur unter Eigene Felder an', async () => {
    mockFindTemplateFields.mockResolvedValue([
      {
        field: {
          id: 'field-location',
          name: 'Veranstaltungsort',
          description: null,
          type: { datatype: 'text' },
        },
      },
    ]);

    const fields = await getDocumentTemplateFieldDefinitions('org-1');

    expect(fields.find((field) => field.key === 'location')).toMatchObject({
      availableInLibrary: false,
    });
    expect(
      fields.find((field) => field.sourceFieldId === 'field-location')
    ).toMatchObject({ label: 'Veranstaltungsort', source: 'custom_field' });
  });
});
