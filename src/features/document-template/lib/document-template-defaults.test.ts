import { describe, expect, it } from 'vitest';
import {
  createDefaultDocumentTemplateContent,
  createDocumentTemplateBlock,
} from './document-template-defaults';
import { normalizeDocumentTemplateContent } from './document-template-storage';

describe('Dokument-Standardvorlage', () => {
  it('erstellt eine leere Seite ohne Kopf- und Fußbereich', () => {
    const content = createDefaultDocumentTemplateContent();

    expect(content.page.header).toMatchObject({ enabled: false, blocks: [] });
    expect(content.page.footer).toMatchObject({ enabled: false, blocks: [] });
    expect(content.blocks).toEqual([]);
    expect(content.document).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
  });

  it('füllt eine ausdrücklich leere Vorlage bei der Normalisierung nicht auf', () => {
    const content = createDefaultDocumentTemplateContent();
    const normalized = normalizeDocumentTemplateContent(content);

    expect(normalized.blocks).toEqual([]);
    expect(normalized.document).toEqual(content.document);
  });

  it('erzeugt den Signaturbaustein ohne nicht verfügbare Datenbankfelder', () => {
    const signature = createDocumentTemplateBlock('signature');

    expect(signature.text).toBe('Mit freundlichen Grüßen');
    expect(signature.text).not.toContain('{{administration');
  });
});
