import { describe, expect, it } from 'vitest';
import {
  deletePageAtIndex,
  mergePageDocuments,
  splitDocumentIntoPages,
} from './document-template-pages';

function page(text: string) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

describe('deletePageAtIndex', () => {
  it('entfernt die zweite Seite vollständig', () => {
    expect(deletePageAtIndex(['Seite 1', 'Seite 2'], 1)).toEqual({
      pages: ['Seite 1'],
      activePageIndex: 0,
    });
  });

  it('macht beim Löschen der ersten Seite die zweite zur ersten Seite', () => {
    expect(deletePageAtIndex(['Seite 1', 'Seite 2'], 0)).toEqual({
      pages: ['Seite 2'],
      activePageIndex: 0,
    });
  });

  it('entfernt eine mittlere Seite ohne Lücke', () => {
    expect(deletePageAtIndex(['Seite 1', 'Seite 2', 'Seite 3'], 1)).toEqual({
      pages: ['Seite 1', 'Seite 3'],
      activePageIndex: 0,
    });
  });

  it('schützt die letzte verbleibende Seite', () => {
    expect(deletePageAtIndex(['Seite 1'], 0)).toBeNull();
  });

  it('lehnt einen ungültigen Seitenindex ab', () => {
    expect(deletePageAtIndex(['Seite 1', 'Seite 2'], 2)).toBeNull();
  });

  it('setzt pageBreaks nur zwischen den verbleibenden Seiten', () => {
    const deletion = deletePageAtIndex(
      [page('Seite 1'), page('Seite 2'), page('Seite 3')],
      1
    );

    expect(deletion).not.toBeNull();
    if (!deletion) return;

    const document = mergePageDocuments(deletion.pages);
    const nodeTypes = document.content?.map((node) => node.type);

    expect(nodeTypes).toEqual(['paragraph', 'pageBreak', 'paragraph']);
    expect(splitDocumentIntoPages(document)).toHaveLength(2);
  });

  it('reduziert zwei Seiten auf eine Seite ohne verbleibenden pageBreak', () => {
    const deletion = deletePageAtIndex([page('Seite 1'), page('Seite 2')], 1);

    expect(deletion).not.toBeNull();
    if (!deletion) return;

    const document = mergePageDocuments(deletion.pages);

    expect(splitDocumentIntoPages(document)).toHaveLength(1);
    expect(document.content?.some((node) => node.type === 'pageBreak')).toBe(
      false
    );
  });
});
