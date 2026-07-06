// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
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
  {
    key: 'custom-unusual-name',
    label: 'Wetter_Test Österreich',
    group: 'custom',
    description: 'Organisationsspezifisches Feld',
    source: 'custom_field',
    dataType: 'date',
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

    expect(
      screen.getAllByRole('button', { name: /FührungText/ })
    ).toHaveLength(2);
    expect(screen.getByText(/Führungen \(1\)/)).toBeDefined();
    expect(screen.queryByText('Verwaltung Name')).toBeNull();
  });

  it('zeigt organisationsspezifische Namen unverändert und sucht nach Typ und Gruppe', () => {
    const onQueryChange = vi.fn();
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
          query="Datum"
          onQueryChange={onQueryChange}
          onInsert={vi.fn()}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('Wetter_Test Österreich')).toBeDefined();
    expect(screen.queryByText('Eigenes Feld')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Feld suchen...'), {
      target: { value: 'Eigene Felder' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('Eigene Felder');
  });
});
