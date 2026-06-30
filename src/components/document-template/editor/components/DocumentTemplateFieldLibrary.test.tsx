// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { DocumentTemplateFieldLibrary } from './DocumentTemplateFieldLibrary';

const fields: DocumentTemplateFieldDefinition[] = [
  {
    key: 'assignmentName',
    label: 'Führung',
    group: 'general',
    description: 'Titel für Führung',
    source: 'standard',
    dataType: 'text',
  },
  {
    key: 'administrationName',
    label: 'Verwaltung Name',
    group: 'administration',
    description: 'Nicht gespeichert',
    source: 'standard',
    dataType: 'text',
    availableInLibrary: false,
  },
  {
    key: 'programName',
    label: 'Programm',
    group: 'event',
    description: 'Programm der Führung',
    source: 'standard',
    dataType: 'text',
  },
];

describe('Bibliothek für dynamische Felder', () => {
  it('zeigt nur verfügbare Felder und organisationsbezogene Gruppen an', () => {
    render(
      <TooltipProvider>
        <DocumentTemplateFieldLibrary
          fields={fields}
          groupLabels={{
            general: 'Allgemein',
            contact: 'Kontakt',
            event: 'Führungen',
            staff: 'Personal',
            administration: 'Verwaltung',
            custom: 'Eigene Felder',
          }}
          query=""
          onQueryChange={vi.fn()}
          onInsert={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: /FührungText/ })).toBeDefined();
    expect(screen.getByText('Führungen')).toBeDefined();
    expect(screen.queryByText('Verwaltung Name')).toBeNull();
  });
});
