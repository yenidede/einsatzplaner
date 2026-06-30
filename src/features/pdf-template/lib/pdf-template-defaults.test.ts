import { describe, expect, it } from 'vitest';
import {
  PDF_TEMPLATE_BLANK_BASE_PDF,
  createDefaultPdfmeTemplate,
  createDefaultStoredPdfTemplate,
} from './pdf-template-defaults';

describe('PDF-Standardvorlage', () => {
  it('erstellt eine leere A4-Seite ohne Schemaelemente', () => {
    expect(createDefaultPdfmeTemplate()).toEqual({
      basePdf: PDF_TEMPLATE_BLANK_BASE_PDF,
      schemas: [[]],
    });
  });

  it('erstellt ein leeres gespeichertes Dokument ohne Footer', () => {
    const document = createDefaultStoredPdfTemplate();

    expect(document.template.schemas).toEqual([[]]);
    expect(document.meta?.footer).toBeNull();
  });
});
