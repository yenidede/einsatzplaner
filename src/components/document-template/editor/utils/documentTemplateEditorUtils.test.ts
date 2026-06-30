import { describe, expect, it } from 'vitest';
import type {
  DocumentTemplateBlock,
  DocumentTemplateRichTextNode,
} from '@/features/document-template/types';
import { upsertAreaTextBlock } from './documentTemplateEditorUtils';

const richText: DocumentTemplateRichTextNode = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Kopfzeile' }],
    },
  ],
};

describe('upsertAreaTextBlock', () => {
  it('persistiert einen temporären Kopfbereich in einer leeren Vorlage', () => {
    const temporaryBlock: DocumentTemplateBlock = {
      id: 'header-fallback',
      type: 'header',
      text: '',
      align: 'right',
    };

    expect(upsertAreaTextBlock([], temporaryBlock, richText)).toEqual([
      { ...temporaryBlock, richText },
    ]);
  });

  it('aktualisiert einen vorhandenen Bereich ohne ihn zu duplizieren', () => {
    const block: DocumentTemplateBlock = {
      id: 'footer-1',
      type: 'footer',
      text: 'Alt',
    };

    expect(upsertAreaTextBlock([block], block, richText)).toEqual([
      { ...block, richText },
    ]);
  });
});
