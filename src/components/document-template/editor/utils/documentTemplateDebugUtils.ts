import type { Editor } from '@tiptap/react';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';
import {
  createRichTextDocumentFromNodes,
  documentPageNodes,
  splitDocumentIntoPages as splitDocumentIntoPagesBase,
} from '@/features/document-template/lib/document-template-pages';
import type {
  PageBodySelectionSnapshot,
  PageDocumentSyncRequest,
  PageFocusRequest,
  PaginationDebugPayload,
  PaginationTransactionType,
} from '../types/documentTemplateEditorTypes';

export function isEmptyParagraphNode(
  node: DocumentTemplateRichTextNode
): boolean {
  return (
    node.type === 'paragraph' &&
    (!node.content || node.content.length === 0) &&
    !node.text
  );
}

export function nodeTextPreview(node: DocumentTemplateRichTextNode): string {
  if (node.text) {
    return node.text.slice(0, 80);
  }

  return (
    node.content
      ?.map(nodeTextPreview)
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) ?? ''
  );
}

export function nodeSignature(node: DocumentTemplateRichTextNode): string {
  return JSON.stringify(node);
}

export function summarizeNodes(nodes: DocumentTemplateRichTextNode[]) {
  return nodes.map((node, index) => ({
    index,
    type: node.type,
    text: nodeTextPreview(node),
  }));
}

export function logPaginationDebug(
  label: string,
  payload: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug(`[pagination-debug] ${label}`, payload);
}

export function logEnterDebug(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug(`[enter-debug] ${label}`, payload);
}

export function logLayoutDebug(
  label: string,
  payload: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug(`[layout-debug] ${label}`, payload);
}

export function containsNodeSignatures(
  nodes: DocumentTemplateRichTextNode[],
  expectedSignatures: string[]
): boolean {
  const currentSignatures = new Set(nodes.map(nodeSignature));
  return expectedSignatures.every((signature) =>
    currentSignatures.has(signature)
  );
}

export function createSelectionSnapshot(
  editor: Editor
): PageBodySelectionSnapshot {
  const { selection } = editor.state;
  return {
    from: selection.from,
    to: selection.to,
    nodeIndex: selection.$from.index(0),
  };
}

export function emptySelectionSnapshot(): PageBodySelectionSnapshot {
  return {
    from: 0,
    to: 0,
    nodeIndex: 0,
  };
}

export function splitDocumentIntoPages(
  document: DocumentTemplateRichTextNode | undefined
): DocumentTemplateRichTextNode[] {
  const pageNodes = documentPageNodes(document);
  logEnterDebug('splitDocumentIntoPages', {
    pageCount: pageNodes.length,
    pages: pageNodes.map((nodes, pageIndex) => ({
      pageIndex,
      nodes: summarizeNodes(nodes),
    })),
  });
  return splitDocumentIntoPagesBase(document);
}

export function countPageBreaks(
  document: DocumentTemplateRichTextNode | undefined
): number {
  return (
    document?.content?.filter((node) => node.type === 'pageBreak').length ?? 0
  );
}

export function logDeletePage(payload: {
  requestedPageIndex: number;
  beforePageCount: number;
  afterPageCount: number;
  pageBreakCountBefore: number;
  pageBreakCountAfter: number;
  activePageIndexBefore: number;
  activePageIndexAfter: number;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[delete-page]', payload);
}

export function logPaginationMutation(payload: PaginationDebugPayload) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[pagination]', payload);
}

export function logEditorSetContent(args: {
  pageIndex: number;
  reason: PageDocumentSyncRequest['reason'];
  selectionBefore: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[editor:setContent]', args);
}

export function logEditorFocus(args: {
  pageIndex: number;
  reason: PageFocusRequest['reason'];
  command: string;
  selectionBefore: unknown;
  selectionAfter: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[editor:focus]', args);
}

export function bodyMeasurementPayload(editor: Editor | null) {
  const proseMirrorElement = editor?.view.dom;
  if (!proseMirrorElement) {
    return null;
  }
  const bodyElement = proseMirrorElement.closest('.document-page-body');
  const bodyContentElement = proseMirrorElement.closest(
    '.document-page-body-content'
  );
  const pageElement = proseMirrorElement.closest('.document-page');
  const bodyStyle =
    bodyElement instanceof HTMLElement
      ? window.getComputedStyle(bodyElement)
      : null;
  const bodyContentStyle =
    bodyContentElement instanceof HTMLElement
      ? window.getComputedStyle(bodyContentElement)
      : null;
  const proseMirrorStyle = window.getComputedStyle(proseMirrorElement);
  const pageStyle =
    pageElement instanceof HTMLElement
      ? window.getComputedStyle(pageElement)
      : null;

  return {
    bodyClientHeight:
      bodyElement instanceof HTMLElement ? bodyElement.clientHeight : null,
    bodyScrollHeight:
      bodyElement instanceof HTMLElement ? bodyElement.scrollHeight : null,
    bodyOffsetHeight:
      bodyElement instanceof HTMLElement ? bodyElement.offsetHeight : null,
    bodyOverflow: bodyStyle?.overflow ?? null,
    bodyOverflowY: bodyStyle?.overflowY ?? null,
    bodyPosition: bodyStyle?.position ?? null,
    bodyTransform: bodyStyle?.transform ?? null,
    bodyTop: bodyStyle?.top ?? null,
    bodyHeight: bodyStyle?.height ?? null,
    bodyContentClientHeight:
      bodyContentElement instanceof HTMLElement
        ? bodyContentElement.clientHeight
        : null,
    bodyContentScrollHeight:
      bodyContentElement instanceof HTMLElement
        ? bodyContentElement.scrollHeight
        : null,
    bodyContentOverflow: bodyContentStyle?.overflow ?? null,
    bodyContentPosition: bodyContentStyle?.position ?? null,
    bodyContentTransform: bodyContentStyle?.transform ?? null,
    proseMirrorClientHeight: proseMirrorElement.clientHeight,
    proseMirrorScrollHeight: proseMirrorElement.scrollHeight,
    proseMirrorOffsetHeight: proseMirrorElement.offsetHeight,
    proseMirrorOverflow: proseMirrorStyle.overflow,
    proseMirrorPosition: proseMirrorStyle.position,
    proseMirrorTransform: proseMirrorStyle.transform,
    proseMirrorMarginTop: proseMirrorStyle.marginTop,
    proseMirrorPaddingTop: proseMirrorStyle.paddingTop,
    pageClientHeight:
      pageElement instanceof HTMLElement ? pageElement.clientHeight : null,
    pageScrollHeight:
      pageElement instanceof HTMLElement ? pageElement.scrollHeight : null,
    pageOverflow: pageStyle?.overflow ?? null,
    pageHeight: pageStyle?.height ?? null,
    textStart: editor.state.doc.textContent.slice(0, 120),
  };
}

export function logCursorDebug(args: {
  action: string;
  reason: string;
  pageIndex: number;
  revision?: number;
  currentRevision?: number;
  isActivePage?: boolean;
  hasOverflow?: boolean;
  overflowNodeIndex?: number;
  scrollHeight?: number;
  clientHeight?: number;
  bodyAreaHeightPx?: number;
  measuredAt?: number;
  transactionType?: PaginationTransactionType;
  transactionDocChanged?: boolean;
  selectionBefore?: unknown;
  selectionAfter?: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[cursor-debug]', {
    ...args,
    stack: new Error().stack,
  });
}
