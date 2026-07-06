import { describe, expect, it } from 'vitest';
import {
  documentText,
  hasDocumentText,
  normalizeDocumentTextBlockContent,
  serializeDocumentTextBlockContent,
} from './document-text-block-storage';
import { DOCUMENT_TEXT_BLOCK_CONTENT_KIND } from '../types';

const document = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Termin ', marks: [{ type: 'bold' }] },
        { type: 'dynamicField', attrs: { fieldKey: 'date' } },
      ],
    },
  ],
};

describe('document-text-block-storage', () => {
  it('behält Text, Formatierung und dynamische Felder beim Speichern', () => {
    const serialized = serializeDocumentTextBlockContent({
      kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
      version: 1,
      description: 'Beschreibung',
      category: 'Hinweis',
      plainText: documentText(document),
      document,
      seedKey: 'contact-block',
    });

    expect(normalizeDocumentTextBlockContent(serialized)).toEqual({
      kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
      version: 1,
      description: 'Beschreibung',
      category: 'Hinweis',
      plainText: 'Termin {{date}}',
      document,
      seedKey: 'contact-block',
    });
  });

  it('akzeptiert dynamische Felder als Inhalt und verwirft leere Dokumente', () => {
    expect(hasDocumentText(document)).toBe(true);
    expect(
      hasDocumentText({ type: 'doc', content: [{ type: 'paragraph' }] })
    ).toBe(false);
  });

  it('verwirft Inhalte mit einem fremden Format', () => {
    expect(normalizeDocumentTextBlockContent({ kind: 'other' })).toBeNull();
  });
});
