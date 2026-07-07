import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import type { DocumentTemplateContent } from '@/features/document-template/types';
import {
  createEmptyRichTextDocument,
  createRichTextDocumentFromNodes,
  deletePageAtIndex,
  documentPageNodes,
  mergePageDocuments,
} from '@/features/document-template/lib/document-template-pages';
import type {
  EditableArea,
  PageBodyChange,
  PageBodyEditorHandle,
  PageDocumentSyncRequest,
  PageFocusRequest,
  PageOverflowMeasurement,
  PaginationContinuationRequest,
} from '../types/documentTemplateEditorTypes';
import {
  AUTO_PAGINATION_ENABLED,
  DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG,
} from '../utils/documentTemplateEditorConstants';
import {
  containsNodeSignatures,
  countPageBreaks,
  isEmptyParagraphNode,
  logCursorDebug,
  logDeletePage,
  logEnterDebug,
  logPaginationDebug,
  logPaginationMutation,
  nodeSignature,
  splitDocumentIntoPages,
  summarizeNodes,
} from '../utils/documentTemplateDebugUtils';
import { toRichTextNode } from '../utils/documentTemplateEditorUtils';

export function useDocumentTemplatePages({
  content,
  setContent,
  markDirty,
  setActiveArea,
  setSelectionRevision,
  updateSelectedDynamicField,
}: {
  content: DocumentTemplateContent;
  setContent: Dispatch<SetStateAction<DocumentTemplateContent>>;
  markDirty: () => void;
  setActiveArea: Dispatch<SetStateAction<EditableArea>>;
  setSelectionRevision: Dispatch<SetStateAction<number>>;
  updateSelectedDynamicField: (
    targetEditor: Editor | null,
    area: EditableArea
  ) => void;
}) {
  const [activeBodyPageIndex, setActiveBodyPageIndex] = useState(0);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [bodyFocusRequest, setBodyFocusRequest] =
    useState<PageFocusRequest | null>(null);
  const [bodyDocumentSyncRequests, setBodyDocumentSyncRequests] = useState<
    Record<number, PageDocumentSyncRequest>
  >({});
  const [paginationContinuationRequest, setPaginationContinuationRequest] =
    useState<PaginationContinuationRequest | null>(null);
  const bodyEditorsRef = useRef<Map<number, PageBodyEditorHandle>>(new Map());
  const overflowWarningShownRef = useRef(false);

  const registerBodyEditor = useCallback(
    (pageIndex: number, editor: PageBodyEditorHandle) => {
      if (editor) {
        bodyEditorsRef.current.set(pageIndex, editor);
        return;
      }

      bodyEditorsRef.current.delete(pageIndex);
    },
    []
  );
  const clearBodyFocusRequest = useCallback((revision: number) => {
    setBodyFocusRequest((current) =>
      current?.revision === revision ? null : current
    );
  }, []);
  const clearBodyDocumentSyncRequest = useCallback(
    (pageIndex: number, revision: number) => {
      setBodyDocumentSyncRequests((current) => {
        const request = current[pageIndex];
        if (!request || request.revision !== revision) return current;

        const next = { ...current };
        delete next[pageIndex];
        return next;
      });
    },
    []
  );

  function handleBodyPageChange(change: PageBodyChange) {
    if (!change.docChanged) return;

    markDirty();
    logEnterDebug('handleBodyPageChange', {
      pageIndex: change.pageIndex,
      transactionType: change.transactionType,
      editRevision: change.editRevision,
      selectionBefore: change.oldSelection,
      selectionAfter: change.newSelection,
      pageNodes: summarizeNodes(change.document.content ?? []),
      parentMergeDisabled:
        DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG &&
        change.transactionType === 'enter',
    });
    logCursorDebug({
      action: 'handleBodyPageChange',
      reason: change.reason,
      pageIndex: change.pageIndex,
      revision: change.editRevision,
      transactionDocChanged: change.docChanged,
      selectionBefore: change.oldSelection,
      selectionAfter: change.newSelection,
    });

    if (
      DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG &&
      change.transactionType === 'enter'
    ) {
      return;
    }

    setContent((current) => {
      const pages = splitDocumentIntoPages(current.document);
      while (pages.length <= change.pageIndex) {
        pages.push(createEmptyRichTextDocument());
      }

      pages[change.pageIndex] = change.document;
      logEnterDebug('before mergePageDocuments', {
        pageIndex: change.pageIndex,
        pageNodes: summarizeNodes(change.document.content ?? []),
      });
      logCursorDebug({
        action: 'mergePageDocuments',
        reason: change.reason,
        pageIndex: change.pageIndex,
        revision: change.editRevision,
        transactionDocChanged: change.docChanged,
        selectionBefore: change.oldSelection,
        selectionAfter: change.newSelection,
      });
      const mergedDocument = mergePageDocuments(pages);
      logEnterDebug('after mergePageDocuments', {
        pageIndex: change.pageIndex,
        totalNodes: summarizeNodes(mergedDocument.content ?? []),
      });

      return {
        ...current,
        document: mergedDocument,
      };
    });
  }

  function handleBodyPageFocus(pageIndex: number, pageEditor: Editor | null) {
    setActiveArea('body');
    logEnterDebug('activePageIndex', {
      previousPageIndex: activeBodyPageIndex,
      nextPageIndex: pageIndex,
      selectionBefore: pageEditor?.state.selection.toJSON(),
    });
    logCursorDebug({
      action: 'setActiveBodyPageIndex',
      reason: 'body-focus',
      pageIndex,
      isActivePage: activeBodyPageIndex === pageIndex,
      selectionBefore: pageEditor?.state.selection.toJSON(),
    });
    setActiveBodyPageIndex(pageIndex);
    setSelectionRevision((current) => current + 1);
    updateSelectedDynamicField(pageEditor, 'body');
  }

  function handleBodyOverflowMeasurement(measurement: PageOverflowMeasurement) {
    logCursorDebug({
      action: 'handleBodyOverflow',
      reason: measurement.reason,
      transactionType: measurement.transactionType,
      pageIndex: measurement.pageIndex,
      revision: measurement.editRevision,
      hasOverflow: measurement.overflowDetected,
      overflowNodeIndex: measurement.overflowNodeIndex,
      scrollHeight: measurement.scrollHeight,
      clientHeight: measurement.clientHeight,
      bodyAreaHeightPx: measurement.bodyAreaHeightPx,
      measuredAt: measurement.measuredAt,
      selectionBefore: measurement.oldSelection,
      selectionAfter: measurement.newSelection,
    });
    if (!measurement.overflowDetected) {
      logCursorDebug({
        action: 'handleBodyOverflow:no-overflow',
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        revision: measurement.editRevision,
        hasOverflow: false,
        overflowNodeIndex: measurement.overflowNodeIndex,
        scrollHeight: measurement.scrollHeight,
        clientHeight: measurement.clientHeight,
        bodyAreaHeightPx: measurement.bodyAreaHeightPx,
        measuredAt: measurement.measuredAt,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      return;
    }

    if (!AUTO_PAGINATION_ENABLED) {
      logCursorDebug({
        action: 'handleBodyOverflow:auto-pagination-disabled',
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        revision: measurement.editRevision,
        hasOverflow: measurement.overflowDetected,
        overflowNodeIndex: measurement.overflowNodeIndex,
        scrollHeight: measurement.scrollHeight,
        clientHeight: measurement.clientHeight,
        bodyAreaHeightPx: measurement.bodyAreaHeightPx,
        measuredAt: measurement.measuredAt,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      if (!overflowWarningShownRef.current) {
        overflowWarningShownRef.current = true;
        toast.info(
          'Diese Seite ist überfüllt. Bitte fügen Sie manuell eine neue Seite ein oder verschieben Sie Inhalte.'
        );
      }
      return;
    }

    setPaginationContinuationRequest(null);

    let nextFocusPageIndex: number | null = null;
    let nextContinuationRequest: PaginationContinuationRequest | null = null;
    let didPaginate = false;
    setContent((current) => {
      const pageNodes = documentPageNodes(current.document);
      const beforePageCount = pageNodes.length;
      const sourceNodes = pageNodes[measurement.pageIndex] ?? [];
      logPaginationDebug('before split', {
        pageIndex: measurement.pageIndex,
        overflowNodeIndex: measurement.overflowNodeIndex,
        nodes: summarizeNodes(sourceNodes),
      });

      if (
        measurement.overflowNodeIndex <= 0 &&
        sourceNodes.length <= 1 &&
        !overflowWarningShownRef.current
      ) {
        overflowWarningShownRef.current = true;
        toast.info('Dieser Inhalt ist zu groß für eine Seite.');
        return current;
      }

      if (
        measurement.overflowNodeIndex <= 0 ||
        measurement.overflowNodeIndex < 0 ||
        measurement.overflowNodeIndex >= sourceNodes.length
      ) {
        logPaginationDebug('split aborted: invalid overflow index', {
          pageIndex: measurement.pageIndex,
          overflowNodeIndex: measurement.overflowNodeIndex,
          sourceNodeCount: sourceNodes.length,
          nodes: summarizeNodes(sourceNodes),
        });
        return current;
      }

      const nextPageIndex = measurement.pageIndex + 1;
      while (pageNodes.length <= nextPageIndex) {
        pageNodes.push([]);
      }

      const movedNodes = sourceNodes.slice(measurement.overflowNodeIndex);
      const keptNodes = sourceNodes.slice(0, measurement.overflowNodeIndex);
      if (keptNodes.length === 0 || movedNodes.length === 0) {
        logPaginationDebug('split aborted: unsafe slices', {
          pageIndex: measurement.pageIndex,
          overflowNodeIndex: measurement.overflowNodeIndex,
          keptNodes: summarizeNodes(keptNodes),
          movedNodes: summarizeNodes(movedNodes),
        });
        return current;
      }

      const keptSignatures = keptNodes.map(nodeSignature);
      const movedSignatures = movedNodes.map(nodeSignature);
      const nextNodes = pageNodes[nextPageIndex] ?? [];
      const normalizedNextNodes =
        nextNodes.length === 1 && isEmptyParagraphNode(nextNodes[0])
          ? []
          : nextNodes;

      pageNodes[measurement.pageIndex] = keptNodes;
      pageNodes[nextPageIndex] = [...movedNodes, ...normalizedNextNodes];
      logPaginationDebug('after split', {
        pageIndex: measurement.pageIndex,
        currentPageNodes: summarizeNodes(
          pageNodes[measurement.pageIndex] ?? []
        ),
        nextPageNodes: summarizeNodes(pageNodes[nextPageIndex] ?? []),
      });

      const currentPageNodes = pageNodes[measurement.pageIndex] ?? [];
      const nextPageNodes = pageNodes[nextPageIndex] ?? [];
      const allPageSignatures = pageNodes.flat().map(nodeSignature);
      const sourceSignatures = sourceNodes.map(nodeSignature);
      const allSourceNodesStillExist = sourceSignatures.every((signature) =>
        allPageSignatures.includes(signature)
      );
      const splitIsValid =
        containsNodeSignatures(currentPageNodes, keptSignatures) &&
        containsNodeSignatures(nextPageNodes, movedSignatures) &&
        allSourceNodesStillExist;

      if (!splitIsValid) {
        logPaginationDebug('split validation failed', {
          pageIndex: measurement.pageIndex,
          overflowNodeIndex: measurement.overflowNodeIndex,
          beforeSplitNodeTexts: summarizeNodes(keptNodes),
          movedNodeTexts: summarizeNodes(movedNodes),
          currentPageNodes: summarizeNodes(currentPageNodes),
          nextPageNodes: summarizeNodes(nextPageNodes),
        });
        return current;
      }

      didPaginate = true;
      overflowWarningShownRef.current = false;
      const cursorWasMoved =
        measurement.newSelection.nodeIndex >= measurement.overflowNodeIndex;
      const afterPageCount = pageNodes.length;

      if (cursorWasMoved) {
        nextFocusPageIndex = nextPageIndex;
      }

      if (measurement.transactionType === 'paste' && measurement.maxSteps > 1) {
        nextContinuationRequest = {
          pageIndex: nextPageIndex,
          revision: Date.now(),
          measurement: {
            reason: 'paste-continuation',
            transactionType: 'paste',
            oldSelection: measurement.oldSelection,
            newSelection: measurement.newSelection,
            maxSteps: measurement.maxSteps - 1,
            editRevision: measurement.editRevision,
          },
        };
      } else if (
        measurement.transactionType === 'paste' &&
        measurement.maxSteps <= 1
      ) {
        toast.info(
          'Die automatische Seitenaufteilung wurde begrenzt. Prüfen Sie den eingefügten Inhalt.'
        );
      }

      logPaginationMutation({
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        beforePageCount,
        afterPageCount,
        overflowDetected: measurement.overflowDetected,
        overflowNodeIndex: measurement.overflowNodeIndex,
        movedNodeCount: movedNodes.length,
        cursorWasMoved,
        oldSelection: measurement.oldSelection,
        newSelection: measurement.newSelection,
      });

      return {
        ...current,
        document: mergePageDocuments(
          pageNodes.map(createRichTextDocumentFromNodes)
        ),
      };
    });

    if (!didPaginate) return;

    if (nextFocusPageIndex !== null) {
      logCursorDebug({
        action: 'setActiveBodyPageIndex',
        reason: 'pagination',
        pageIndex: nextFocusPageIndex,
        revision: measurement.editRevision,
        hasOverflow: true,
      });
      setActiveBodyPageIndex(nextFocusPageIndex);
      logCursorDebug({
        action: 'focusRequest:set',
        reason: 'pagination',
        transactionType: measurement.transactionType,
        pageIndex: nextFocusPageIndex,
        revision: measurement.editRevision,
        hasOverflow: true,
        overflowNodeIndex: measurement.overflowNodeIndex,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      setBodyFocusRequest({
        pageIndex: nextFocusPageIndex,
        revision: Date.now(),
        reason: 'pagination',
        position: 'start',
      });
    }

    const syncRevision = Date.now();
    logCursorDebug({
      action: 'documentSyncRequest:set',
      reason: 'pagination',
      transactionType: measurement.transactionType,
      pageIndex: measurement.pageIndex,
      revision: measurement.editRevision,
      hasOverflow: true,
      overflowNodeIndex: measurement.overflowNodeIndex,
      selectionBefore: measurement.oldSelection,
      selectionAfter: measurement.newSelection,
    });
    setBodyDocumentSyncRequests((current) => ({
      ...current,
      [measurement.pageIndex]: {
        pageIndex: measurement.pageIndex,
        revision: syncRevision,
        reason: 'pagination',
        editRevision: measurement.editRevision,
      },
      [measurement.pageIndex + 1]: {
        pageIndex: measurement.pageIndex + 1,
        revision: syncRevision,
        reason: 'pagination',
      },
    }));

    if (nextContinuationRequest) {
      setPaginationContinuationRequest(nextContinuationRequest);
    }
  }

  function addManualPage() {
    const nextPageIndex = splitDocumentIntoPages(content.document).length;
    markDirty();
    setActiveArea('body');
    setContent((current) => {
      const pages = splitDocumentIntoPages(current.document);
      pages.push(createEmptyRichTextDocument());

      return {
        ...current,
        document: mergePageDocuments(pages),
      };
    });
    logCursorDebug({
      action: 'setActiveBodyPageIndex',
      reason: 'explicit-user-action',
      pageIndex: nextPageIndex,
    });
    setActiveBodyPageIndex(nextPageIndex);
    setBodyFocusRequest({
      pageIndex: nextPageIndex,
      revision: Date.now(),
      reason: 'explicit-user-action',
      position: 'start',
    });
    toast.success('Neue Seite wurde hinzugefügt.');
  }

  function deletePage(pageIndex: number) {
    const pages = splitDocumentIntoPages(content.document).flatMap(
      (page, index) => {
        const pageEditor = bodyEditorsRef.current.get(index);
        return pageEditor
          ? splitDocumentIntoPages(toRichTextNode(pageEditor.getJSON()))
          : [page];
      }
    );
    if (pages.length <= 1) {
      toast.info('Die letzte Seite kann nicht gelöscht werden.');
      return;
    }

    if (pageIndex < 0 || pageIndex >= pages.length) {
      setPageToDelete(null);
      toast.error('Die Seite konnte nicht gelöscht werden.');
      return;
    }

    const deletion = deletePageAtIndex(pages, pageIndex);
    if (!deletion) {
      setPageToDelete(null);
      toast.error('Die Seite konnte nicht gelöscht werden.');
      return;
    }

    const beforeDocument = mergePageDocuments(pages);
    const nextDocument = mergePageDocuments(deletion.pages);
    const afterPageCount = splitDocumentIntoPages(nextDocument).length;
    if (afterPageCount !== pages.length - 1) {
      setPageToDelete(null);
      toast.error('Die Seite konnte nicht vollständig gelöscht werden.');
      return;
    }

    const syncRevision = Date.now();
    const nextSyncRequests: Record<number, PageDocumentSyncRequest> = {};
    deletion.pages.forEach((_, index) => {
      nextSyncRequests[index] = {
        pageIndex: index,
        revision: syncRevision,
        reason: 'explicit-user-action',
      };
    });

    logDeletePage({
      requestedPageIndex: pageIndex,
      beforePageCount: pages.length,
      afterPageCount,
      pageBreakCountBefore: countPageBreaks(beforeDocument),
      pageBreakCountAfter: countPageBreaks(nextDocument),
      activePageIndexBefore: activeBodyPageIndex,
      activePageIndexAfter: deletion.activePageIndex,
    });

    markDirty();
    setActiveArea('body');
    setPageToDelete(null);
    setContent((current) => ({
      ...current,
      document: nextDocument,
    }));
    setActiveBodyPageIndex(deletion.activePageIndex);
    setBodyDocumentSyncRequests(nextSyncRequests);
    setPaginationContinuationRequest(null);
    setBodyFocusRequest({
      pageIndex: deletion.activePageIndex,
      revision: Date.now(),
      reason: 'explicit-user-action',
      position: 'start',
    });
    toast.success('Seite wurde gelöscht.');
  }

  return {
    activeBodyPageIndex,
    addManualPage,
    bodyDocumentSyncRequests,
    bodyEditorsRef,
    bodyFocusRequest,
    clearBodyDocumentSyncRequest,
    clearBodyFocusRequest,
    deletePage,
    handleBodyOverflowMeasurement,
    handleBodyPageChange,
    handleBodyPageFocus,
    pageToDelete,
    paginationContinuationRequest,
    registerBodyEditor,
    setPageToDelete,
  };
}
