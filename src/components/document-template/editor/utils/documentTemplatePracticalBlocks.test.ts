import { describe, expect, it } from 'vitest';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { createPracticalBlockContent } from './documentTemplatePracticalBlocks';

describe('fachliche Dokumentbausteine', () => {
  it('übernimmt organisationsspezifische Feldnamen unverändert', () => {
    const fields = new Map<string, DocumentTemplateFieldDefinition>([
      [
        'helpers',
        {
          key: 'helpers',
          label: 'Kulturvermittler:innen',
          group: 'staff',
          description: 'Eingeteilte Personen',
          source: 'standard',
          dataType: 'list',
        },
      ],
    ]);

    const content = createPracticalBlockContent('staffBlock', fields);

    expect(JSON.stringify(content)).toContain('Kulturvermittler:innen');
    expect(JSON.stringify(content)).toContain('Erstellt von');
    expect(JSON.stringify(content)).not.toContain('administrationFunction');
  });

  it('bereitet einen kontrollierten Abstand ohne leere Textzeichen vor', () => {
    const content = createPracticalBlockContent('spacer', new Map());

    expect(content).toEqual([
      {
        type: 'paragraph',
        attrs: { spacingTop: 20, spacingBottom: 20 },
      },
    ]);
  });
});
