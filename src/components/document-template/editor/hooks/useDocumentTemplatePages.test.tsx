// @vitest-environment jsdom

import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  DocumentTemplateContent,
  DocumentTemplateRichTextNode,
} from '@/features/document-template/types';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import { splitDocumentIntoPages } from '@/features/document-template/lib/document-template-pages';
import { useDocumentTemplatePages } from './useDocumentTemplatePages';

function paragraph(value: string): DocumentTemplateRichTextNode {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text: value }],
  };
}

function usePaginationHarness(initialContent: DocumentTemplateContent) {
  const [content, setContent] = useState(initialContent);
  const pages = useDocumentTemplatePages({
    content,
    setContent,
    markDirty: vi.fn(),
    setActiveArea: vi.fn(),
    setSelectionRevision: vi.fn(),
    updateSelectedDynamicField: vi.fn(),
  });

  return { content, pages };
}

describe('useDocumentTemplatePages', () => {
  it('verschiebt beim Enter überlaufende Knoten auf eine neue Seite', () => {
    const initialContent = createDefaultDocumentTemplateContent();
    initialContent.document = {
      type: 'doc',
      content: [paragraph('Bleibt auf Seite 1'), paragraph('Wechselt')],
    };

    const { result } = renderHook(() =>
      usePaginationHarness(initialContent)
    );

    act(() => {
      result.current.pages.handleBodyOverflowMeasurement({
        reason: 'document-change',
        transactionType: 'enter',
        pageIndex: 0,
        oldSelection: { from: 20, to: 20, nodeIndex: 0 },
        newSelection: { from: 22, to: 22, nodeIndex: 1 },
        maxSteps: 1,
        editRevision: 1,
        overflowDetected: true,
        overflowNodeIndex: 1,
        scrollHeight: 760,
        clientHeight: 740,
        bodyAreaHeightPx: 740,
        measuredAt: Date.now(),
      });
    });

    const pages = splitDocumentIntoPages(result.current.content.document);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.content).toEqual([paragraph('Bleibt auf Seite 1')]);
    expect(pages[1]?.content).toEqual([paragraph('Wechselt')]);
    expect(result.current.pages.activeBodyPageIndex).toBe(1);
    expect(result.current.pages.bodyFocusRequest).toMatchObject({
      pageIndex: 1,
      reason: 'pagination',
      position: 'start',
    });
  });
});
