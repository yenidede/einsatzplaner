import { useCallback, useEffect, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';
import type {
  PageBodyChange,
  PageBodyEditorHandle,
  PageBodySelectionSnapshot,
  PageDocumentSyncRequest,
  PageFocusRequest,
  PageOverflowMeasurement,
  PaginationContinuationRequest,
  PaginationTransactionType,
  PendingPaginationMeasurement,
} from '../types/documentTemplateEditorTypes';
import {
  AUTO_PAGINATION_ENABLED,
  DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG,
  ENTER_PAGINATION_STEP_LIMIT,
  PASTE_PAGINATION_STEP_LIMIT,
} from '../utils/documentTemplateEditorConstants';
import {
  bodyMeasurementPayload,
  createSelectionSnapshot,
  emptySelectionSnapshot,
  logCursorDebug,
  logEditorFocus,
  logEditorSetContent,
  logEnterDebug,
  logLayoutDebug,
  logPaginationDebug,
  summarizeNodes,
} from '../utils/documentTemplateDebugUtils';
import {
  createEditorExtensions,
  toRichTextNode,
} from '../utils/documentTemplateEditorUtils';
import { insertParagraphAfterInfoBoxAtEnd } from '../tiptap/document-template-nodes';

export function PageBodyEditor({
  pageIndex,
  document,
  bodyAreaWidthPx,
  bodyAreaHeightPx,
  isActivePage,
  focusRequest,
  documentSyncRequest,
  paginationContinuation,
  registerEditor,
  onChange,
  onFocus,
  onDocumentSyncApplied,
  onFocusRequestApplied,
  onOverflowMeasured,
}: {
  pageIndex: number;
  document: DocumentTemplateRichTextNode;
  bodyAreaWidthPx: number;
  bodyAreaHeightPx: number;
  isActivePage: boolean;
  focusRequest: PageFocusRequest | null;
  documentSyncRequest: PageDocumentSyncRequest | null;
  paginationContinuation: PaginationContinuationRequest | null;
  registerEditor: (pageIndex: number, editor: PageBodyEditorHandle) => void;
  onChange: (change: PageBodyChange) => void;
  onFocus: () => void;
  onDocumentSyncApplied: (pageIndex: number, revision: number) => void;
  onFocusRequestApplied: (revision: number) => void;
  onOverflowMeasured: (measurement: PageOverflowMeasurement) => void;
}) {
  const lastAppliedDocumentRef = useRef(JSON.stringify(document));
  const measureFrameRef = useRef<number | null>(null);
  const pageEditorRef = useRef<Editor | null>(null);
  const pendingPaginationRef = useRef<PendingPaginationMeasurement | null>(
    null
  );
  const nextTransactionTypeRef = useRef<PaginationTransactionType>('content');
  const previousSelectionRef = useRef<PageBodySelectionSnapshot>(
    emptySelectionSnapshot()
  );
  const editRevisionRef = useRef(0);
  const appliedDocumentSyncRevisionRef = useRef(0);
  const appliedFocusRevisionRef = useRef(0);
  const appliedContinuationRevisionRef = useRef(0);
  const initialPageIndexRef = useRef(pageIndex);
  const initialIsActivePageRef = useRef(isActivePage);

  useEffect(() => {
    const mountedPageIndex = initialPageIndexRef.current;
    const mountedIsActivePage = initialIsActivePageRef.current;

    logEnterDebug('PageBodyEditor mounted', {
      pageIndex: mountedPageIndex,
      isActivePage: mountedIsActivePage,
    });
    logCursorDebug({
      action: 'PageBodyEditor mounted',
      reason: 'mount',
      pageIndex: mountedPageIndex,
      isActivePage: mountedIsActivePage,
    });

    return () => {
      logEnterDebug('PageBodyEditor unmounted', {
        pageIndex: mountedPageIndex,
        isActivePage: mountedIsActivePage,
      });
      logCursorDebug({
        action: 'PageBodyEditor unmounted',
        reason: 'unmount',
        pageIndex: mountedPageIndex,
        isActivePage: mountedIsActivePage,
      });
    };
  }, []);

  const measureOverflow = useCallback(() => {
    const pendingPagination = pendingPaginationRef.current;
    pendingPaginationRef.current = null;
    if (!pendingPagination) return;

    if (pendingPagination.editRevision !== editRevisionRef.current) {
      logCursorDebug({
        action: 'measureOverflow:stale',
        reason: pendingPagination.reason,
        pageIndex,
        revision: pendingPagination.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
      });
      return;
    }

    const editorDom = pageEditorRef.current?.view.dom;
    if (!editorDom) return;

    const availableHeight = Math.max(0, bodyAreaHeightPx - 20);
    const children = Array.from(editorDom.children);
    const documentChildCount = pageEditorRef.current?.state.doc.childCount ?? 0;
    const overflowIndex = children.findIndex(
      (child) =>
        child instanceof HTMLElement &&
        child.offsetTop + child.scrollHeight > availableHeight + 8
    );
    const overflowDetected = overflowIndex >= 0;
    const scrollHeight = editorDom.scrollHeight;
    const clientHeight = editorDom.clientHeight;
    const measuredAt = Date.now();

    logCursorDebug({
      action: 'overflow-result',
      reason: pendingPagination.reason,
      transactionType: pendingPagination.transactionType,
      pageIndex,
      revision: pendingPagination.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      hasOverflow: overflowDetected,
      overflowNodeIndex: overflowIndex,
      scrollHeight,
      clientHeight,
      bodyAreaHeightPx,
      measuredAt,
      selectionBefore: pendingPagination.oldSelection,
      selectionAfter: pendingPagination.newSelection,
    });
    logPaginationDebug('overflow measurement', {
      pageIndex,
      availableHeight,
      documentChildCount,
      domChildCount: children.length,
      overflowNodeIndex: overflowIndex,
      children: children.map((child, index) => {
        if (!(child instanceof HTMLElement)) {
          return { index, type: 'non-element' };
        }

        return {
          index,
          tagName: child.tagName,
          offsetTop: child.offsetTop,
          scrollHeight: child.scrollHeight,
          bottom: child.offsetTop + child.scrollHeight,
          text: child.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80),
        };
      }),
    });

    onOverflowMeasured({
      ...pendingPagination,
      pageIndex,
      overflowDetected,
      overflowNodeIndex: overflowIndex,
      scrollHeight,
      clientHeight,
      bodyAreaHeightPx,
      measuredAt,
    });
  }, [bodyAreaHeightPx, isActivePage, onOverflowMeasured, pageIndex]);

  const scheduleMeasureOverflow = useCallback(() => {
    if (measureFrameRef.current !== null) {
      window.cancelAnimationFrame(measureFrameRef.current);
    }

    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measureOverflow();
    });
  }, [measureOverflow]);

  const pageEditor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content: document,
    editorProps: {
      attributes: {
        class:
          'document-template-prose document-template-body-editor outline-none focus:outline-none',
        style: `width: ${bodyAreaWidthPx}px; min-width: ${bodyAreaWidthPx}px; max-width: ${bodyAreaWidthPx}px;`,
      },
      handleDOMEvents: {
        focus: () => {
          logEnterDebug('focus', {
            pageIndex,
            isActivePage,
            selection: pageEditorRef.current?.state.selection.toJSON(),
          });
          onFocus();
          return false;
        },
        keydown: (_, event) => {
          nextTransactionTypeRef.current =
            event.key === 'Enter' ? 'enter' : 'content';

          if (
            event.key === 'Enter' &&
            pageEditorRef.current &&
            insertParagraphAfterInfoBoxAtEnd(pageEditorRef.current)
          ) {
            return true;
          }

          return false;
        },
        paste: () => {
          nextTransactionTypeRef.current = 'paste';
          return false;
        },
        input: () => {
          return false;
        },
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) {
        return;
      }

      editRevisionRef.current += 1;
      const editRevision = editRevisionRef.current;
      const transactionType = nextTransactionTypeRef.current;
      nextTransactionTypeRef.current = 'content';
      const oldSelection = previousSelectionRef.current;
      const newSelection = createSelectionSnapshot(editor);
      const nextDocument = toRichTextNode(editor.getJSON());
      const pendingPagination: PendingPaginationMeasurement = {
        reason: 'document-change',
        transactionType,
        oldSelection,
        newSelection,
        maxSteps:
          transactionType === 'paste'
            ? PASTE_PAGINATION_STEP_LIMIT
            : ENTER_PAGINATION_STEP_LIMIT,
        editRevision,
      };

      lastAppliedDocumentRef.current = JSON.stringify(nextDocument);
      pendingPaginationRef.current = pendingPagination;
      logCursorDebug({
        action: 'onUpdate',
        reason: 'document-change',
        pageIndex,
        revision: editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        transactionDocChanged: transaction.docChanged,
        selectionBefore: oldSelection,
        selectionAfter: newSelection,
      });
      logEnterDebug('onUpdate', {
        pageIndex,
        isActivePage,
        transactionType,
        editRevision,
        selectionBefore: oldSelection,
        selectionAfter: newSelection,
        docTextStart: editor.state.doc.textContent.slice(0, 120),
        bodyMeasurement: bodyMeasurementPayload(editor),
        parentMergeDisabled:
          DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG && transactionType === 'enter',
      });
      logEnterDebug('css/body measurement', {
        pageIndex,
        isActivePage,
        transactionType,
        bodyMeasurement: bodyMeasurementPayload(editor),
      });
      if (transactionType === 'enter') {
        logLayoutDebug('editor text after enter', {
          pageIndex,
          text: editor.getText(),
          json: editor.getJSON(),
        });
        logLayoutDebug('body measurement', {
          pageIndex,
          bodyMeasurement: bodyMeasurementPayload(editor),
        });
      }

      scheduleMeasureOverflow();

      if (DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG && transactionType === 'enter') {
        logEnterDebug('handleBodyPageChange skipped', {
          pageIndex,
          transactionType,
          editRevision,
          reason: 'parent-merge-disabled-for-enter',
          selectionBefore: oldSelection,
          selectionAfter: newSelection,
          pageNodes: summarizeNodes(nextDocument.content ?? []),
        });
        return;
      }

      onChange({
        ...pendingPagination,
        pageIndex,
        document: nextDocument,
        docChanged: transaction.docChanged,
      });
    },
    onSelectionUpdate: ({ editor }) => {
      previousSelectionRef.current = createSelectionSnapshot(editor);
      logEnterDebug('selectionUpdate', {
        pageIndex,
        isActivePage,
        selection: editor.state.selection.toJSON(),
        docTextStart: editor.state.doc.textContent.slice(0, 120),
      });
      logCursorDebug({
        action: 'selectionUpdate',
        reason: 'tiptap-selection',
        pageIndex,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionAfter: editor.state.selection.toJSON(),
      });
      onFocus();
    },
  });

  useEffect(() => {
    pageEditorRef.current = pageEditor;
  }, [pageEditor]);

  useEffect(() => {
    registerEditor(pageIndex, pageEditor);
    return () => registerEditor(pageIndex, null);
  }, [pageEditor, pageIndex, registerEditor]);

  useEffect(() => {
    logEnterDebug('document prop changed', {
      pageIndex,
      isActivePage,
      editorFocused: pageEditor?.isFocused,
      selection: pageEditor?.state.selection.toJSON(),
      docTextStart: pageEditor?.state.doc.textContent.slice(0, 120),
    });
    logCursorDebug({
      action: 'PageBodyEditor document prop changed',
      reason: 'document-prop',
      pageIndex,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore: pageEditor?.state.selection.toJSON(),
    });
  }, [document, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (documentSyncRequest) {
      logCursorDebug({
        action: 'documentSyncRequest',
        reason: documentSyncRequest.reason,
        pageIndex,
        revision: documentSyncRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [documentSyncRequest, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (focusRequest) {
      logCursorDebug({
        action: 'focusRequest',
        reason: focusRequest.reason,
        pageIndex,
        revision: focusRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [focusRequest, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (paginationContinuation) {
      logCursorDebug({
        action: 'paginationContinuation',
        reason: paginationContinuation.measurement.reason,
        pageIndex,
        revision: paginationContinuation.measurement.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [isActivePage, pageEditor, pageIndex, paginationContinuation]);

  useEffect(() => {
    if (
      !pageEditor ||
      !documentSyncRequest ||
      documentSyncRequest.pageIndex !== pageIndex ||
      documentSyncRequest.revision <= appliedDocumentSyncRevisionRef.current
    ) {
      return;
    }

    if (
      isActivePage &&
      documentSyncRequest.editRevision !== undefined &&
      documentSyncRequest.editRevision !== editRevisionRef.current
    ) {
      logCursorDebug({
        action: 'setContent:blocked-stale-active-page',
        reason: documentSyncRequest.reason,
        pageIndex,
        revision: documentSyncRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor.state.selection.toJSON(),
      });
      appliedDocumentSyncRevisionRef.current = documentSyncRequest.revision;
      onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
      return;
    }

    appliedDocumentSyncRevisionRef.current = documentSyncRequest.revision;
    const nextDocument = JSON.stringify(document);
    const currentEditorDocument = JSON.stringify(
      toRichTextNode(pageEditor.getJSON())
    );
    if (currentEditorDocument === nextDocument) {
      lastAppliedDocumentRef.current = nextDocument;
      onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
      return;
    }

    lastAppliedDocumentRef.current = nextDocument;
    logEditorSetContent({
      pageIndex,
      reason: documentSyncRequest.reason,
      selectionBefore: pageEditor.state.selection.toJSON(),
    });
    logEnterDebug('setContent called', {
      reason: documentSyncRequest.reason,
      pageIndex,
      isActivePage,
      editorFocused: pageEditor.isFocused,
      selectionBefore: pageEditor.state.selection.toJSON(),
      stack: new Error().stack,
    });
    logCursorDebug({
      action: 'setContent',
      reason: documentSyncRequest.reason,
      pageIndex,
      revision: documentSyncRequest.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore: pageEditor.state.selection.toJSON(),
    });
    pageEditor.commands.setContent(document, { emitUpdate: false });
    onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
  }, [
    document,
    documentSyncRequest,
    isActivePage,
    onDocumentSyncApplied,
    pageEditor,
    pageIndex,
  ]);

  useEffect(() => {
    if (!paginationContinuation) return;
    if (!AUTO_PAGINATION_ENABLED) {
      logCursorDebug({
        action: 'paginationContinuation:auto-pagination-disabled',
        reason: paginationContinuation.measurement.reason,
        pageIndex,
        revision: paginationContinuation.measurement.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
      });
      return;
    }
    if (
      paginationContinuation.revision <= appliedContinuationRevisionRef.current
    ) {
      return;
    }

    appliedContinuationRevisionRef.current = paginationContinuation.revision;
    pendingPaginationRef.current = {
      ...paginationContinuation.measurement,
      editRevision: editRevisionRef.current,
    };
    scheduleMeasureOverflow();
  }, [
    isActivePage,
    pageIndex,
    paginationContinuation,
    scheduleMeasureOverflow,
  ]);

  useEffect(() => {
    if (
      !pageEditor ||
      !focusRequest ||
      focusRequest.pageIndex !== pageIndex ||
      focusRequest.revision <= appliedFocusRevisionRef.current
    ) {
      return;
    }

    if (
      focusRequest.reason !== 'pagination' &&
      focusRequest.reason !== 'explicit-user-action'
    ) {
      appliedFocusRevisionRef.current = focusRequest.revision;
      return;
    }

    if (
      focusRequest.editRevision !== undefined &&
      focusRequest.editRevision !== editRevisionRef.current
    ) {
      logCursorDebug({
        action: 'focus:blocked-stale',
        reason: focusRequest.reason,
        pageIndex,
        revision: focusRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor.state.selection.toJSON(),
      });
      appliedFocusRevisionRef.current = focusRequest.revision;
      onFocusRequestApplied(focusRequest.revision);
      return;
    }

    appliedFocusRevisionRef.current = focusRequest.revision;
    const selectionBefore = pageEditor.state.selection.toJSON();
    pageEditor.chain().focus(focusRequest.position).run();
    logEditorFocus({
      pageIndex,
      reason: 'pagination',
      command: `focus(${focusRequest.position})`,
      selectionBefore,
      selectionAfter: pageEditor.state.selection.toJSON(),
    });
    logCursorDebug({
      action: 'focus',
      reason: focusRequest.reason,
      pageIndex,
      revision: focusRequest.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore,
      selectionAfter: pageEditor.state.selection.toJSON(),
    });
    onFocusRequestApplied(focusRequest.revision);
  }, [
    focusRequest,
    isActivePage,
    onFocusRequestApplied,
    pageEditor,
    pageIndex,
  ]);

  useEffect(
    () => () => {
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
    },
    []
  );

  return <EditorContent editor={pageEditor} />;
}
