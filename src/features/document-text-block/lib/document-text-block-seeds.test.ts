import { describe, expect, it } from 'vitest';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { createInitialDocumentTextBlockSeeds } from './document-text-block-seeds';

describe('initiale Textbausteine', () => {
  it('erstellt vier normale Textbausteine mit stabilen internen Schlüsseln', () => {
    const seeds = createInitialDocumentTextBlockSeeds([]);

    expect(seeds.map((seed) => seed.name)).toEqual([
      'Kontaktblock',
      'Einsatz-/Terminblock',
      'Preisblock',
      'Personalblock',
    ]);
    expect(new Set(seeds.map((seed) => seed.seedKey)).size).toBe(4);
    expect(seeds.every((seed) => seed.document.type === 'doc')).toBe(true);
  });

  it('behält organisationsspezifische Feldnamen in den Startbausteinen', () => {
    const field: DocumentTemplateFieldDefinition = {
      key: 'helpers',
      label: 'Kulturvermittler:innen',
      group: 'staff',
      description: 'Eingeteilte Personen',
      source: 'standard',
      dataType: 'list',
    };
    const personalBlock = createInitialDocumentTextBlockSeeds([field]).find(
      (seed) => seed.seedKey === 'staff-block'
    );
    const serialized = JSON.stringify(personalBlock?.document);

    expect(serialized).toContain('Kulturvermittler:innen');
    expect(serialized).toContain('Erstellt von');
    expect(serialized).not.toContain('administrationFunction');
  });
});
