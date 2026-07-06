// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentTextBlock } from '@/features/document-text-block/types';
import { DOCUMENT_TEXT_BLOCK_DRAG_MIME } from '../editor/utils/documentTemplateEditorConstants';
import { DocumentTextBlockInsertList } from './DocumentTextBlockInsertList';

const textBlock: DocumentTextBlock = {
  id: 'text-block-1',
  organizationId: 'organization-1',
  name: 'Begrüßung',
  description: 'Standardbegrüßung',
  category: 'Allgemein',
  plainText: 'Sehr geehrte Damen und Herren',
  document: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Sehr geehrte Damen und Herren' }],
      },
    ],
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('DocumentTextBlockInsertList', () => {
  it('stellt eigene Textbausteine zum Kopieren per Drag-and-drop bereit', () => {
    const setData = vi.fn();
    render(
      <DocumentTextBlockInsertList
        standardTemplates={[]}
        textBlocks={[textBlock]}
        onInsert={vi.fn()}
        onEditStandard={vi.fn()}
        onDuplicateStandard={vi.fn()}
      />
    );

    fireEvent.dragStart(
      screen.getByRole('button', {
        name: /Begrüßung.*Sehr geehrte Damen und Herren/,
      }),
      { dataTransfer: { effectAllowed: 'none', setData } }
    );

    expect(setData).toHaveBeenCalledWith(
      DOCUMENT_TEXT_BLOCK_DRAG_MIME,
      JSON.stringify(textBlock.document.content)
    );
  });

  it('fügt eigene Textbausteine weiterhin per Klick ein', () => {
    const onInsert = vi.fn();
    render(
      <DocumentTextBlockInsertList
        standardTemplates={[]}
        textBlocks={[textBlock]}
        onInsert={onInsert}
        onEditStandard={vi.fn()}
        onDuplicateStandard={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Begrüßung.*Sehr geehrte Damen und Herren/,
      })
    );

    expect(onInsert).toHaveBeenCalledWith(textBlock);
  });

  it('zeigt für eigene Textbausteine nur die einheitlichen Aktionen', async () => {
    render(
      <DocumentTextBlockInsertList
        standardTemplates={[]}
        textBlocks={[textBlock]}
        onInsert={vi.fn()}
        onEditStandard={vi.fn()}
        onDuplicateStandard={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Aktionen für Begrüßung' })
    );

    expect(
      await screen.findByRole('menuitem', { name: 'Einfügen' })
    ).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Bearbeiten' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Duplizieren' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Löschen' })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Umbenennen' })).toBeNull();
  });

  it('bietet Standardvorlagen zum Bearbeiten und Duplizieren, aber nicht zum Löschen an', async () => {
    const onEditStandard = vi.fn();
    const onDuplicateStandard = vi.fn();
    const standardTemplate = {
      id: 'standard-contact',
      name: 'Kontaktblock',
      description: 'Kontaktdaten',
      plainText: 'Kontaktdaten',
      document: textBlock.document,
    };
    render(
      <DocumentTextBlockInsertList
        standardTemplates={[standardTemplate]}
        textBlocks={[]}
        onInsert={vi.fn()}
        onEditStandard={onEditStandard}
        onDuplicateStandard={onDuplicateStandard}
      />
    );

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Aktionen für Kontaktblock' })
    );
    const editItem = await screen.findByRole('menuitem', {
      name: 'Bearbeiten',
    });
    expect(screen.getByRole('menuitem', { name: 'Duplizieren' })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Umbenennen' })).toBeNull();
    expect(
      screen.queryByRole('menuitem', {
        name: 'Als eigenen Textbaustein kopieren',
      })
    ).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Löschen' })).toBeNull();
    fireEvent.click(editItem);
    expect(onEditStandard).toHaveBeenCalledWith(standardTemplate);
  });

  it('zeigt Standard- und eigene Textbausteine in einer gemeinsamen Gruppe ohne Herkunftslabels', () => {
    render(
      <DocumentTextBlockInsertList
        standardTemplates={[
          {
            id: 'standard-contact',
            name: 'Kontaktblock',
            description: 'Kontaktdaten',
            plainText: 'Kontaktdaten',
            document: textBlock.document,
          },
        ]}
        textBlocks={[textBlock]}
        onInsert={vi.fn()}
        onEditStandard={vi.fn()}
        onDuplicateStandard={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Textbausteine' })).toBeDefined();
    expect(screen.getByText('Kontaktblock')).toBeDefined();
    expect(screen.getByText('Begrüßung')).toBeDefined();
    expect(screen.queryByText('Standardvorlagen')).toBeNull();
    expect(screen.queryByText('Eigene Textbausteine')).toBeNull();
    expect(screen.queryByText('Allgemein')).toBeNull();
  });
});
