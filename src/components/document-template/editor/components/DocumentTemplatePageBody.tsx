import { PageBodyEditor } from './DocumentTemplatePageBodyEditor';
import { createEmptyRichTextDocument } from '@/features/document-template/lib/document-template-pages';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplatePageBody({ controller, pageIndex }: { controller: DocumentTemplateEditorControllerModel; pageIndex: number }) {
  const {
    handleBodyPageFocus,
    handleBodyOverflowMeasurement,
    activeBodyPageIndex,
    bodyAreaHeightPx,
    bodyDocumentSyncRequests,
    bodyEditorsRef,
    bodyFocusRequest,
    bodyPageDocuments,
    clearBodyDocumentSyncRequest,
    clearBodyFocusRequest,
    content,
    handleBodyPageChange,
    handleFieldDrop,
    pageContentWidthPx,
    paginationContinuationRequest,
    registerBodyEditor,
    setActiveArea,
    template,
  } = controller;

  return (
    <>
    <div
      className="document-page-body border-border relative box-border min-w-0 overflow-hidden border-x border-dashed"
      style={{
        width: pageContentWidthPx,
        minWidth: pageContentWidthPx,
        maxWidth: pageContentWidthPx,
        height: bodyAreaHeightPx,
        minHeight: bodyAreaHeightPx,
        maxHeight: bodyAreaHeightPx,
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={() => setActiveArea('body')}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleFieldDrop(event, 'body')}
    >
      <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
        Dokumentinhalt
      </span>
      <div
        className="document-page-body-content document-template-body-measure min-w-0 pt-[20px]"
        style={{
          width: pageContentWidthPx,
          minWidth: pageContentWidthPx,
          maxWidth: pageContentWidthPx,
          height: bodyAreaHeightPx,
          minHeight: bodyAreaHeightPx,
          maxHeight: bodyAreaHeightPx,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <PageBodyEditor
          pageIndex={pageIndex}
          document={
            bodyPageDocuments[pageIndex] ??
            createEmptyRichTextDocument()
          }
          bodyAreaWidthPx={pageContentWidthPx}
          bodyAreaHeightPx={bodyAreaHeightPx}
          isActivePage={activeBodyPageIndex === pageIndex}
          focusRequest={
            activeBodyPageIndex === pageIndex
              ? bodyFocusRequest
              : null
          }
          documentSyncRequest={
            bodyDocumentSyncRequests[pageIndex] ?? null
          }
          paginationContinuation={
            paginationContinuationRequest?.pageIndex ===
            pageIndex
              ? paginationContinuationRequest
              : null
          }
          registerEditor={registerBodyEditor}
          onChange={handleBodyPageChange}
          onFocus={() =>
            handleBodyPageFocus(
              pageIndex,
              bodyEditorsRef.current.get(pageIndex) ?? null
            )
          }
          onDocumentSyncApplied={
            clearBodyDocumentSyncRequest
          }
          onFocusRequestApplied={clearBodyFocusRequest}
          onOverflowMeasured={handleBodyOverflowMeasurement}
        />
      </div>
    </div>
    </>
  );
}
