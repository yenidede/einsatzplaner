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
        onCopyStandard={vi.fn()}
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
        onCopyStandard={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Begrüßung.*Sehr geehrte Damen und Herren/,
      })
    );

    expect(onInsert).toHaveBeenCalledWith(textBlock);
  });

  it('bietet Standardvorlagen nur zum Einfügen oder Kopieren an', () => {
    const onCopyStandard = vi.fn();
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
        onCopyStandard={onCopyStandard}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Aktionen für Kontaktblock' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Als eigene Vorlage kopieren' })
    );

    expect(onCopyStandard).toHaveBeenCalledWith(standardTemplate);
    expect(screen.queryByRole('menuitem', { name: /Bearbeiten/ })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Löschen' })).toBeNull();
  });
});
