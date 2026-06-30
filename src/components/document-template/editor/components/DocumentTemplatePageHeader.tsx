import { DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG } from '../utils/documentTemplateEditorConstants';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';
import { DocumentTemplateFixedAreaEditor } from './DocumentTemplateFixedAreaEditor';

export function DocumentTemplatePageHeader({
  controller,
  pageIndex,
}: {
  controller: DocumentTemplateEditorControllerModel;
  pageIndex: number;
}) {
  const {
    content,
    handleFieldDrop,
    headerEditor,
    headerHeightPx,
    pageContentWidthPx,
    setActiveArea,
  } = controller;

  return (
    <>
      {!DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG &&
      content.page.header.enabled ? (
        <div
          className="border-border bg-muted/20 relative box-border flex min-w-0 flex-col justify-center overflow-hidden border-x border-t border-dashed"
          style={{
            width: pageContentWidthPx,
            minWidth: pageContentWidthPx,
            maxWidth: pageContentWidthPx,
            height: headerHeightPx,
            minHeight: headerHeightPx,
            maxHeight: headerHeightPx,
          }}
          onClick={() => setActiveArea('header')}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleFieldDrop(event, 'header')}
        >
          <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
            Kopfbereich
          </span>
          {pageIndex === 0 ? (
            <DocumentTemplateFixedAreaEditor editor={headerEditor} />
          ) : (
            <span className="text-muted-foreground px-[8px] pt-[16px] text-xs">
              Kopfbereich wie Seite 1
            </span>
          )}
        </div>
      ) : DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG ? null : (
        <div />
      )}
    </>
  );
}
