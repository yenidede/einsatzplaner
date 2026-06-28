import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';

export type DeletePageAtIndexResult<T> = {
  pages: T[];
  activePageIndex: number;
};

export function deletePageAtIndex<T>(
  pages: readonly T[],
  pageIndex: number
): DeletePageAtIndexResult<T> | null {
  if (
    pages.length <= 1 ||
    !Number.isInteger(pageIndex) ||
    pageIndex < 0 ||
    pageIndex >= pages.length
  ) {
    return null;
  }

  return {
    pages: pages.filter((_, index) => index !== pageIndex),
    activePageIndex: Math.max(0, pageIndex - 1),
  };
}

export function createEmptyRichTextDocument(): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };
}

export function createRichTextDocumentFromNodes(
  nodes: DocumentTemplateRichTextNode[]
): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : createEmptyRichTextDocument().content,
  };
}

export function documentPageNodes(
  document: DocumentTemplateRichTextNode | undefined
): DocumentTemplateRichTextNode[][] {
  const pages: DocumentTemplateRichTextNode[][] = [[]];

  for (const node of document?.content ?? []) {
    if (node.type === 'pageBreak') {
      pages.push([]);
      continue;
    }

    pages[pages.length - 1]?.push(node);
  }

  return pages;
}

export function splitDocumentIntoPages(
  document: DocumentTemplateRichTextNode | undefined
): DocumentTemplateRichTextNode[] {
  return documentPageNodes(document).map(createRichTextDocumentFromNodes);
}

export function mergePageDocuments(
  pages: readonly DocumentTemplateRichTextNode[]
): DocumentTemplateRichTextNode {
  const content: DocumentTemplateRichTextNode[] = [];

  pages.forEach((page, index) => {
    if (index > 0) {
      content.push({ type: 'pageBreak' });
    }

    content.push(
      ...(page.content ?? createEmptyRichTextDocument().content ?? [])
    );
  });

  return createRichTextDocumentFromNodes(content);
}
